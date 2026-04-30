import { pgTable, uuid, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";

export const settings = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyName: text("company_name").notNull(),
  companyEmail: text("company_email").notNull(),
  companyPhone: text("company_phone").notNull(),
  companyAddress: text("company_address").notNull(),
  companyWebsite: text("company_website").notNull(),
  invoicePrefix: text("invoice_prefix").notNull().default("FD"),
  invoiceNumberDigits: integer("invoice_number_digits").notNull().default(3),
  defaultCurrency: text("default_currency").notNull().default("LKR"),
  defaultTaxPercentage: numeric("default_tax_percentage", { precision: 5, scale: 2 }).notNull().default("0"),
  defaultPaymentTerms: integer("default_payment_terms").notNull().default(7),
  defaultNotes: text("default_notes").notNull().default("Terms:\n1. Please settle the due amount within 3-4 business days.\n2. Services are non-refundable once delivered\n3. Please include the invoice number in your payment reference.\n\nNotes:\nThank you for your business!\nQuestions? Contact us at accounts@focaldive.io"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
