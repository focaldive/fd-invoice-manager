import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { invoices } from "./invoices";

export const deliveryChannels = ["email", "whatsapp"] as const;
export type DeliveryChannel = (typeof deliveryChannels)[number];

export const deliveryStatuses = ["sent", "failed"] as const;
export type DeliveryStatus = (typeof deliveryStatuses)[number];

export const invoiceDeliveryLog = pgTable(
  "invoice_delivery_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    channel: text("channel", { enum: deliveryChannels }).notNull(),
    recipient: text("recipient").notNull(),
    status: text("status", { enum: deliveryStatuses }).notNull(),
    externalMessageId: text("external_message_id"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("delivery_log_invoice_idx").on(t.invoiceId)],
);
