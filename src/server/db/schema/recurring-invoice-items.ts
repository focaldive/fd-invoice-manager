import { pgTable, uuid, text, numeric, integer } from "drizzle-orm/pg-core";
import { recurringInvoices } from "./recurring-invoices";

export const recurringInvoiceItems = pgTable("recurring_invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  recurringInvoiceId: uuid("recurring_invoice_id")
    .notNull()
    .references(() => recurringInvoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
});
