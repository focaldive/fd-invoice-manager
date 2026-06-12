import { pgTable, uuid, text, numeric, integer } from "drizzle-orm/pg-core";
import { payslips } from "./payslips";

export const payslipItemTypes = ["earning", "deduction"] as const;
export type PayslipItemType = (typeof payslipItemTypes)[number];

export const payslipItems = pgTable("payslip_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  payslipId: uuid("payslip_id")
    .notNull()
    .references(() => payslips.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  type: text("type", { enum: payslipItemTypes }).notNull().default("earning"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
});
