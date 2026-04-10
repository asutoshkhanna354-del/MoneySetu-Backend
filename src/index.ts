import app from "./app";
import { logger } from "./lib/logger";
import { seedDefaultAdmin, runMigrations } from "./lib/seed.js";
import { startInterestCron } from "./lib/interestAccrual.js";
import { startPay0StatusChecker } from "./routes/pay0.js";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  runMigrations().then(() => seedDefaultAdmin());
  startInterestCron();
  startPay0StatusChecker();

  // Keep Neon DB connection alive — pings every 4 min to prevent cold starts
  const pingDb = () =>
    pool.query("SELECT 1").catch((e: Error) =>
      logger.warn({ err: e.message }, "DB keepalive ping failed"),
    );
  pingDb();
  setInterval(pingDb, 4 * 60 * 1000);
});
