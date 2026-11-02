import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { employees, paymentModes } from "./employees";

export const recurringPayslips = pgTable(
  "recurring_payslips",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    currency: text("currency").notNull().default("LKR"),
    paymentMode: text("payment_mode", { enum: paymentModes }).notNull().default("bank_transfer"),
    notes: text("notes"),
    authorizedByName: text("authorized_by_name"),
    authorizedByTitle: text("authorized_by_title"),
    /** Months between the pay period and the payment date (0 = same month, 1 = paid the month after). */
    periodOffsetMonths: integer("period_offset_months").notNull().default(0),
    dayOfMonth: integer("day_of_month").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    generatedCount: integer("generated_count").notNull().default(0),
    nextGenerationDate: date("next_generation_date").notNull(),
    lastGeneratedAt: timestamp("last_generated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check(
      "recurring_payslips_day_of_month_range",
      sql`${t.dayOfMonth} >= 1 AND ${t.dayOfMonth} <= 28`,
    ),
    check(
      "recurring_payslips_period_offset_range",
      sql`${t.periodOffsetMonths} >= 0 AND ${t.periodOffsetMonths} <= 12`,
    ),
  ],
);
