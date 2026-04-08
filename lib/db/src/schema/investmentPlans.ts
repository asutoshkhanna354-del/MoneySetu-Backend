import { pgTable, serial, text, decimal, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const investmentPlansTable = pgTable("investment_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  minAmount: decimal("min_amount", { precision: 15, scale: 2 }).notNull(),
  maxAmount: decimal("max_amount", { precision: 15, scale: 2 }).notNull(),
  dailyReturnPercent: decimal("daily_return_percent", { precision: 5, scale: 2 }).notNull(),
  durationDays: integer("duration_days").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInvestmentPlanSchema = createInsertSchema(investmentPlansTable).omit({ id: true, createdAt: true });
export type InsertInvestmentPlan = z.infer<typeof insertInvestmentPlanSchema>;
export type InvestmentPlan = typeof investmentPlansTable.$inferSelect;
