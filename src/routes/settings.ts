import { Router } from "express";
import { db } from "@workspace/db";
import { siteSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth.js";

const router = Router();

// ── GET contact settings (public) ────────────────────────────
router.get("/settings/contact", async (_req, res) => {
  try {
    const rows = await db.select().from(siteSettingsTable);
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;

    res.json({
      whatsapp:     map["contact_whatsapp"]  || "",
      instagram:    map["contact_instagram"] || "",
      telegram:     map["contact_telegram"]  || "",
      supportEmail: map["support_email"]     || "",
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ── PATCH contact settings (admin only) ──────────────────────
router.patch("/admin/settings/contact", requireAdmin, async (req, res) => {
  try {
    const { whatsapp, instagram, telegram, supportEmail } = req.body;

    async function upsert(key: string, value: string) {
      const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key));
      if (existing.length > 0) {
        await db.update(siteSettingsTable).set({ value, updatedAt: new Date() }).where(eq(siteSettingsTable.key, key));
      } else {
        await db.insert(siteSettingsTable).values({ key, value });
      }
    }

    if (whatsapp     !== undefined) await upsert("contact_whatsapp",  whatsapp.trim());
    if (instagram    !== undefined) await upsert("contact_instagram", instagram.trim());
    if (telegram     !== undefined) await upsert("contact_telegram",  telegram.trim());
    if (supportEmail !== undefined) await upsert("support_email",     supportEmail.trim());

    res.json({ message: "Contact settings updated", whatsapp, instagram, telegram, supportEmail });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
