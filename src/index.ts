// Force IPv4 DNS resolution — Gmail SMTP hangs on IPv6 in many cloud environments
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import app from "./app";
import { logger } from "./lib/logger";
import { seedDefaultAdmin, runMigrations } from "./lib/seed.js";
import { startInterestCron } from "./lib/interestAccrual.js";
import { startPay0StatusChecker } from "./routes/pay0.js";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

(async () => {
  // ── 1. Warm up Neon DB BEFORE accepting any requests ──────────────────────
  try {
    await pool.query("SELECT 1");
    logger.info("DB pre-warm OK");
  } catch (err) {
    logger.warn({ err }, "DB pre-warm failed — server will still start");
  }

  // ── 2. Start listening ────────────────────────────────────────────────────
  await new Promise<void>((resolve, reject) => {
    app.listen(port, (err?: Error) => {
      if (err) { reject(err); return; }
      resolve();
    });
  });

  logger.info({ port }, "Server listening");

  // ── 3. Background tasks ───────────────────────────────────────────────────
  runMigrations().then(() => seedDefaultAdmin());
  startInterestCron();
  startPay0StatusChecker();

  // Keep Neon DB alive — ping every 2 min so it never goes cold
  setInterval(
    () => pool.query("SELECT 1").catch((e: Error) =>
      logger.warn({ err: e.message }, "DB keepalive ping failed")),
    2 * 60 * 1000,
  );
})().catch(err => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
