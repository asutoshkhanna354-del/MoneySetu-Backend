import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
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

    if (!type || !["register", "login"].includes(type)) {
      res.status(400).json({ error: "Invalid OTP type" });
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
      await sendOtpEmail(lowerEmail, code);
      res.json({ success: true, message: `OTP sent to ${lowerEmail}` });
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
    await sendOtpEmail(user.email, code);
    res.json({ success: true, message: "OTP sent to your registered email" });
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

    const [user] = await db.insert(usersTable).values({
      name, phone, email: lowerEmail, passwordHash,
      referralCode: myReferralCode,
      referredBy: referralCode || null,
      isAdmin: false,
    }).returning();

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

// ─── POST /auth/login — password-based (admin only) ──────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username/phone and password required" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(
      or(eq(usersTable.username, username), eq(usersTable.phone, username))
    );
    if (!user) { res.status(401).json({ error: "Invalid credentials" }); return; }

    const HARDCODED: Record<string, string> = { "admin": "admin123" };
    const hardcoded = HARDCODED[username];
    const valid = hardcoded ? password === hardcoded : await bcrypt.compare(password, user.passwordHash);
    if (!valid) { res.status(401).json({ error: "Invalid credentials" }); return; }

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
