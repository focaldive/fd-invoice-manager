ALTER TABLE "invoice_delivery_log" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "invoice_delivery_log" CASCADE;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "default_notes" SET DEFAULT 'Terms:
1. Please settle the due amount within 3-4 business days.
2. Services are non-refundable once delivered
3. Please include the invoice number in your payment reference.

Notes:
Thank you for your business!
Questions? Contact us at accounts@focaldive.io';--> statement-breakpoint
ALTER TABLE "invoices" DROP COLUMN "sent_on_whatsapp";--> statement-breakpoint
ALTER TABLE "invoices" DROP COLUMN "sent_on_email";--> statement-breakpoint
ALTER TABLE "recurring_invoices" DROP COLUMN "auto_send_whatsapp";