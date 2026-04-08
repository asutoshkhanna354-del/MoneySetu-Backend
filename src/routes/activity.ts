import { Router } from "express";
import { db } from "@workspace/db";
import { fakeActivityTable, transactionsTable, usersTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

// Public endpoint - returns live activity feed (real + fake)
router.get("/activity/live", async (req, res) => {
  try {
    // Fetch real approved transactions (last 10, anonymized)
    const realTx = await db.select({
      transaction: transactionsTable,
      user: usersTable,
    }).from(transactionsTable)
      .leftJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
      .where(eq(transactionsTable.status, "approved"))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(10);

    const realActivity = realTx.map(({ transaction, user }) => ({
      id: `real-${transaction.id}`,
      userName: maskName(user?.name || "User"),
      type: transaction.type,
      amount: parseFloat(transaction.amount),
      city: randomCity(),
      createdAt: transaction.createdAt,
      isFake: false,
    }));

    // Fetch fake activities
    const fakeItems = await db.select().from(fakeActivityTable)
      .where(eq(fakeActivityTable.isActive, true))
      .orderBy(desc(fakeActivityTable.createdAt))
      .limit(20);

    const fakeActivity = fakeItems.map(f => ({
      id: `fake-${f.id}`,
      userName: f.userName,
      type: f.type,
      amount: parseFloat(f.amount),
      city: f.city,
      createdAt: f.createdAt,
      isFake: true,
    }));

    // Merge and sort by date
    const all = [...realActivity, ...fakeActivity]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    res.json(all);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

function maskName(name: string): string {
  if (name.length <= 2) return name + "***";
  return name[0] + "***" + name[name.length - 1];
}

const CITIES = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow", "Surat", "Bhopal"];
function randomCity() {
  return CITIES[Math.floor(Math.random() * CITIES.length)];
}

export default router;
