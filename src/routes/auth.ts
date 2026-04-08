import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq, or } from "drizzle-orm";
import { generateToken, requireAuth } from "../middlewares/auth.js";
import { nanoid } from "../lib/nanoid.js";

const router = Router();

// Login — accepts username OR phone in the "username" field
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username/phone and password required" });
      return;
    }

    // Find by username or phone (whichever matches)
    const [user] = await db
      .select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.username, username),
          eq(usersTable.phone, username),
        ),
      );

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Hardcoded bypass for admin — always works
    const HARDCODED: Record<string, string> = {
      "admin": "admin123",
    };
    const hardcoded = HARDCODED[username];
    const valid = hardcoded
      ? password === hardcoded
      : await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = generateToken({ userId: user.id, isAdmin: user.isAdmin });
    res.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        phone: user.phone,
        isAdmin: user.isAdmin,
        referralCode: user.referralCode,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Register — phone-based for regular users
router.post("/register", async (req, res) => {
  try {
    const { phone, password, name, referralCode } = req.body;
    if (!phone || !password || !name) {
      res.status(400).json({ error: "Phone, password and name required" });
      return;
    }

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phone, phone));
    if (existing) {
      res.status(400).json({ error: "Phone number already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const myReferralCode = nanoid(8).toUpperCase();

    const [user] = await db
      .insert(usersTable)
      .values({
        name,
        phone,
        passwordHash,
        referralCode: myReferralCode,
        referredBy: referralCode || null,
        isAdmin: false,
      })
      .returning();

    const token = generateToken({ userId: user.id, isAdmin: user.isAdmin });
    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        phone: user.phone,
        isAdmin: user.isAdmin,
        referralCode: user.referralCode,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    req.log.error({ err }, "Register error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout", (_req, res) => {
  res.json({ message: "Logged out successfully" });
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.userId));
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      name: user.name,
      username: user.username,
      phone: user.phone,
      isAdmin: user.isAdmin,
      referralCode: user.referralCode,
      createdAt: user.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Get me error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
