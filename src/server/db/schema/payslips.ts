import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  date,
  numeric,
  integer,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { employees, paymentModes } from "./employees";

export const payslipStatuses = ["draft", "paid"] as const;
export type PayslipStatus = (typeof payslipStatuses)[number];

export const payslips = pgTable(
  "payslips",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slipNumber: text("slip_number").notNull().unique(),
    employeeId: uuid("employee_id").references(() => employees.id, {
      onDelete: "set null",
    }),
    payPeriodMonth: integer("pay_period_month").notNull(),
    payPeriodYear: integer("pay_period_year").notNull(),
    paymentDate: date("payment_date").notNull(),
    paymentMode: text("payment_mode", { enum: paymentModes }).notNull().default("bank_transfer"),
    status: text("status", { enum: payslipStatuses }).notNull().default("draft"),
    currency: text("currency").notNull().default("LKR"),
    grossPay: numeric("gross_pay", { precision: 12, scale: 2 }).notNull().default("0"),
    totalDeductions: numeric("total_deductions", { precision: 12, scale: 2 }).notNull().default("0"),
    netPay: numeric("net_pay", { precision: 12, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    authorizedByName: text("authorized_by_name"),
    authorizedByTitle: text("authorized_by_title"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("payslips_employee_idx").on(t.employeeId),
    index("payslips_status_idx").on(t.status),
    index("payslips_period_idx").on(t.payPeriodYear, t.payPeriodMonth),
    check(
      "pay_period_month_range",
      sql`${t.payPeriodMonth} >= 1 AND ${t.payPeriodMonth} <= 12`,
    ),
  ],
);
