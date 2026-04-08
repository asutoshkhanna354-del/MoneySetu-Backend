import { pgTable, serial, integer, decimal, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const referralCommissionsTable = pgTable("referral_commissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  fromUserId: integer("from_user_id").notNull().references(() => usersTable.id),
  level: integer("level").notNull(), // 1, 2, or 3
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  sourceAmount: decimal("source_amount", { precision: 15, scale: 2 }).notNull(),
  type: text("type").notNull().default("deposit"), // deposit
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ReferralCommission = typeof referralCommissionsTable.$inferSelect;
