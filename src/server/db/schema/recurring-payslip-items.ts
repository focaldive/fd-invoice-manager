import { pgTable, uuid, text, numeric, integer } from "drizzle-orm/pg-core";
import { recurringPayslips } from "./recurring-payslips";
import { payslipItemTypes } from "./payslip-items";

export const recurringPayslipItems = pgTable("recurring_payslip_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  recurringPayslipId: uuid("recurring_payslip_id")
    .notNull()
    .references(() => recurringPayslips.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  type: text("type", { enum: payslipItemTypes }).notNull().default("earning"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
});
