import { pgTable, uuid, text, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { invoices } from "./invoices";

export const paymentMethods = ["bank_transfer", "cash", "payhere", "paypal", "other"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  paymentMethod: text("payment_method", { enum: paymentMethods }).notNull(),
  reference: text("reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
