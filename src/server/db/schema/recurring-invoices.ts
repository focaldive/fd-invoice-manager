import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  boolean,
  date,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { clients } from "./clients";

export const recurringInvoices = pgTable(
  "recurring_invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    currency: text("currency").notNull().default("LKR"),
    taxPercentage: numeric("tax_percentage", { precision: 5, scale: 2 }).notNull().default("0"),
    discountPercentage: numeric("discount_percentage", { precision: 5, scale: 2 }).notNull().default("0"),
    discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    category: text("category").notNull().default("other"),
    dayOfMonth: integer("day_of_month").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    generatedCount: integer("generated_count").notNull().default(0),
    nextGenerationDate: date("next_generation_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check("day_of_month_range", sql`${t.dayOfMonth} >= 1 AND ${t.dayOfMonth} <= 28`),
  ],
);
