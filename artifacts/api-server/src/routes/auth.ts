import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, transactionsTable } from "@workspace/db/schema";
import { eq, or } from "drizzle-orm";
import { generateToken, requireAuth } from "../middlewares/auth.js";
import { nanoid } from "../lib/nanoid.js";
import { sendOtpEmail } from "../lib/email.js";
import crypto from "crypto";

const router = Router();

// ─── In-memory OTP store ──────────────────────────────────────────────────────
interface OtpRecord {
  code: string;
  expiry: Date;
  attempts: number;
  userId?: number;
  purpose?: "register" | "login" | "forgot";
}
const otpStore = new Map<string, OtpRecord>(); // key = email
const otpRequestLog = new Map<string, number[]>(); // rate limiting

function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const log = (otpRequestLog.get(email) || []).filter(t => now - t < windowMs);
  if (log.length >= 3) return true;
  log.push(now);
  otpRequestLog.set(email, log);
  return false;
}

// ─── POST /auth/send-otp ──────────────────────────────────────────────────────
router.post("/send-otp", async (req, res) => {
  try {
    const { email, phone, type } = req.body as { email?: string; phone?: string; type: "register" | "login" };

    if (!type || !["register", "login", "forgot"].includes(type)) {
      res.status(400).json({ error: "Invalid OTP type" });
      return;
    }

    if (type === "forgot") {
      const forgotEmail = email || phone;
      if (!forgotEmail) {
        res.status(400).json({ error: "Email required" });
        return;
      }
      const lowerForgotEmail = forgotEmail.toLowerCase();
      const [forgotUser] = await db.select().from(usersTable).where(
        or(eq(usersTable.email, lowerForgotEmail), eq(usersTable.phone, forgotEmail))
      );
      if (!forgotUser) {
        res.status(404).json({ error: "No account found with this email" });
        return;
      }
      if (!forgotUser.email) {
        res.status(400).json({ error: "No email linked to this account" });
        return;
      }
      if (isRateLimited(forgotUser.email)) {
        res.status(429).json({ error: "Too many requests. Wait 5 minutes and try again." });
        return;
      }
      const code = generateOtp();
      otpStore.set(forgotUser.email, { code, expiry: new Date(Date.now() + 5 * 60 * 1000), attempts: 0, userId: forgotUser.id, purpose: "forgot" });
      const sent = await sendOtpEmail(forgotUser.email, code);
      if (sent) {
        res.json({ success: true, message: "Password reset OTP sent to your email", emailHint: forgotUser.email });
      } else {
        res.status(500).json({ success: false, message: "Failed to send OTP, try again" });
      }
      return;
    }

    if (type === "register") {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: "Valid email required" });
        return;
      }
      const lowerEmail = email.toLowerCase();
      const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, lowerEmail));
      if (existing) {
        res.status(400).json({ error: "Email already registered. Please login instead." });
        return;
      }
      if (isRateLimited(lowerEmail)) {
        res.status(429).json({ error: "Too many OTP requests. Wait 5 minutes and try again." });
        return;
      }
      const code = generateOtp();
      otpStore.set(lowerEmail, { code, expiry: new Date(Date.now() + 5 * 60 * 1000), attempts: 0 });
      const sent = await sendOtpEmail(lowerEmail, code);
      if (sent) {
        res.json({ success: true, message: "OTP sent successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to send OTP, try again" });
      }
      return;
    }

    // login type
    const identifier = phone || email;
    if (!identifier) {
      res.status(400).json({ error: "Phone number or email required" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(
      or(eq(usersTable.phone, identifier), eq(usersTable.email, identifier.toLowerCase()))
    );
    if (!user) {
      res.status(404).json({ error: "No account found with this phone/email" });
      return;
    }
    if (!user.email) {
      res.status(400).json({ error: "No email linked to this account. Contact support." });
      return;
    }
    if (isRateLimited(user.email)) {
      res.status(429).json({ error: "Too many OTP requests. Wait 5 minutes and try again." });
      return;
    }
    const code = generateOtp();
    otpStore.set(user.email, { code, expiry: new Date(Date.now() + 5 * 60 * 1000), attempts: 0, userId: user.id });
    const sent = await sendOtpEmail(user.email, code);
    if (sent) {
      res.json({ success: true, message: "OTP sent successfully" });
    } else {
      res.status(500).json({ success: false, message: "Failed to send OTP, try again" });
    }
  } catch (err) {
    req.log.error({ err }, "Send OTP error");
    res.status(500).json({ error: "Failed to send OTP. Check email configuration." });
  }
});

// ─── POST /auth/register ──────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { phone, email, password, name, referralCode, otp } = req.body;
    if (!phone || !email || !password || !name) {
      res.status(400).json({ error: "Name, phone, email and password are required" });
      return;
    }
    if (!otp) {
      res.status(400).json({ error: "OTP is required. Please verify your email first." });
      return;
    }

    const lowerEmail = email.toLowerCase();
    const record = otpStore.get(lowerEmail);
    if (!record) {
      res.status(400).json({ error: "OTP not found or expired. Please request a new one." });
      return;
    }
    if (new Date() > record.expiry) {
      otpStore.delete(lowerEmail);
      res.status(400).json({ error: "OTP has expired. Please request a new one." });
      return;
    }
    record.attempts += 1;
    if (record.attempts > 5) {
      otpStore.delete(lowerEmail);
      res.status(400).json({ error: "Too many wrong attempts. Request a new OTP." });
      return;
    }
    if (record.code !== otp.toString()) {
      res.status(400).json({ error: `Incorrect OTP. ${5 - record.attempts} attempt(s) remaining.` });
      return;
    }
    otpStore.delete(lowerEmail);

    const [existingPhone] = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
    if (existingPhone) { res.status(400).json({ error: "Phone number already registered" }); return; }
    const [existingEmail] = await db.select().from(usersTable).where(eq(usersTable.email, lowerEmail));
    if (existingEmail) { res.status(400).json({ error: "Email already registered" }); return; }

    const passwordHash = await bcrypt.hash(password, 10);
    const myReferralCode = nanoid(8).toUpperCase();

    const SIGNUP_BONUS = 5;
    const [user] = await db.insert(usersTable).values({
      name, phone, email: lowerEmail, passwordHash,
      referralCode: myReferralCode,
      referredBy: referralCode || null,
      isAdmin: false,
      balance: SIGNUP_BONUS.toString(),
      totalEarnings: SIGNUP_BONUS.toString(),
    }).returning();

    // Record the signup bonus as a transaction
    await db.insert(transactionsTable).values({
      userId: user.id,
      type: "bonus",
      amount: SIGNUP_BONUS.toString(),
      status: "approved",
      notes: "Sign-up welcome bonus",
    }).catch(() => {});

    const token = generateToken({ userId: user.id, isAdmin: user.isAdmin });
    res.status(201).json({
      user: { id: user.id, name: user.name, username: user.username, phone: user.phone, email: user.email, isAdmin: user.isAdmin, referralCode: user.referralCode, createdAt: user.createdAt },
      token,
    });
  } catch (err) {
    req.log.error({ err }, "Register error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /auth/login-otp — OTP-based login for regular users ─────────────────
router.post("/login-otp", async (req, res) => {
  try {
    const { identifier, otp } = req.body;
    if (!identifier || !otp) {
      res.status(400).json({ error: "Phone/email and OTP are required" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(
      or(eq(usersTable.phone, identifier), eq(usersTable.email, identifier.toLowerCase()))
    );
    if (!user || !user.email) { res.status(401).json({ error: "Account not found" }); return; }

    const record = otpStore.get(user.email);
    if (!record) { res.status(400).json({ error: "OTP not found or expired. Please request a new one." }); return; }
    if (new Date() > record.expiry) { otpStore.delete(user.email); res.status(400).json({ error: "OTP expired. Request a new one." }); return; }
    record.attempts += 1;
    if (record.attempts > 5) { otpStore.delete(user.email); res.status(400).json({ error: "Too many attempts. Request a new OTP." }); return; }
    if (record.code !== otp.toString()) {
      res.status(400).json({ error: `Incorrect OTP. ${5 - record.attempts} attempt(s) remaining.` });
      return;
    }
    otpStore.delete(user.email);

    const token = generateToken({ userId: user.id, isAdmin: user.isAdmin });
    res.json({
      user: { id: user.id, name: user.name, username: user.username, phone: user.phone, email: user.email, isAdmin: user.isAdmin, referralCode: user.referralCode, createdAt: user.createdAt },
      token,
    });
  } catch (err) {
    req.log.error({ err }, "Login OTP error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /auth/login — password-based (email/phone/username + password) ──────
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Email/phone and password required" });
      return;
    }
    const identifier = username.trim();
    const [user] = await db.select().from(usersTable).where(
      or(
        eq(usersTable.username, identifier),
        eq(usersTable.phone, identifier),
        eq(usersTable.email, identifier.toLowerCase()),
      )
    );
    if (!user) { res.status(401).json({ error: "Invalid email or password" }); return; }

    const valid = user.passwordHash
      ? await bcrypt.compare(password, user.passwordHash)
      : false;
    if (!valid) { res.status(401).json({ error: "Invalid email or password" }); return; }

    const token = generateToken({ userId: user.id, isAdmin: user.isAdmin });
    res.json({
      user: { id: user.id, name: user.name, username: user.username, phone: user.phone, email: user.email, isAdmin: user.isAdmin, referralCode: user.referralCode, createdAt: user.createdAt },
      token,
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /auth/reset-password ─────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      res.status(400).json({ error: "Email, OTP and new password are required" });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    const lowerEmail = email.toLowerCase();
    const record = otpStore.get(lowerEmail);
    if (!record || record.purpose !== "forgot") {
      res.status(400).json({ error: "OTP not found or expired. Request a new one." });
      return;
    }
    if (new Date() > record.expiry) {
      otpStore.delete(lowerEmail);
      res.status(400).json({ error: "OTP expired. Request a new one." });
      return;
    }
    record.attempts += 1;
    if (record.attempts > 5) {
      otpStore.delete(lowerEmail);
      res.status(400).json({ error: "Too many wrong attempts. Request a new OTP." });
      return;
    }
    if (record.code !== otp.toString()) {
      res.status(400).json({ error: `Incorrect OTP. ${5 - record.attempts} attempt(s) remaining.` });
      return;
    }
    otpStore.delete(lowerEmail);

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.email, lowerEmail));
    res.json({ success: true, message: "Password updated successfully. You can now log in." });
  } catch (err) {
    req.log.error({ err }, "Reset password error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout", (_req, res) => { res.json({ message: "Logged out successfully" }); });

router.get("/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
    if (!user) { res.status(401).json({ error: "User not found" }); return; }
    res.json({ id: user.id, name: user.name, username: user.username, phone: user.phone, email: user.email, isAdmin: user.isAdmin, referralCode: user.referralCode, createdAt: user.createdAt });
  } catch (err) {
    req.log.error({ err }, "Get me error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
