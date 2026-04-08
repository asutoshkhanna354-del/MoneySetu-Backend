import { pgTable, serial, text, decimal, timestamp, boolean } from "drizzle-orm/pg-core";

export const fakeActivityTable = pgTable("fake_activity", {
  id: serial("id").primaryKey(),
  userName: text("user_name").notNull(),
  type: text("type").notNull(), // deposit, withdrawal, investment, earning
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  city: text("city"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type FakeActivity = typeof fakeActivityTable.$inferSelect;
