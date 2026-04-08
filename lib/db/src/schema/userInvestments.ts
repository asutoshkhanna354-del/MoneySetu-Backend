import { pgTable, serial, integer, decimal, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { investmentPlansTable } from "./investmentPlans";

export const userInvestmentsTable = pgTable("user_investments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  planId: integer("plan_id").notNull().references(() => investmentPlansTable.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  dailyReturnPercent: decimal("daily_return_percent", { precision: 5, scale: 2 }).notNull(),
  durationDays: integer("duration_days").notNull(),
  status: text("status").notNull().default("active"), // active, completed
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date").notNull(),
  totalEarned: decimal("total_earned", { precision: 15, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserInvestmentSchema = createInsertSchema(userInvestmentsTable).omit({ id: true, createdAt: true });
export type InsertUserInvestment = z.infer<typeof insertUserInvestmentSchema>;
export type UserInvestment = typeof userInvestmentsTable.$inferSelect;
