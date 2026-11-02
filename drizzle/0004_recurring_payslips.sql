CREATE TABLE "recurring_payslips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"currency" text DEFAULT 'LKR' NOT NULL,
	"payment_mode" text DEFAULT 'bank_transfer' NOT NULL,
	"notes" text,
	"authorized_by_name" text,
	"authorized_by_title" text,
	"period_offset_months" integer DEFAULT 0 NOT NULL,
	"day_of_month" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"generated_count" integer DEFAULT 0 NOT NULL,
	"next_generation_date" date NOT NULL,
	"last_generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_payslips_day_of_month_range" CHECK ("recurring_payslips"."day_of_month" >= 1 AND "recurring_payslips"."day_of_month" <= 28),
	CONSTRAINT "recurring_payslips_period_offset_range" CHECK ("recurring_payslips"."period_offset_months" >= 0 AND "recurring_payslips"."period_offset_months" <= 12)
);
--> statement-breakpoint
CREATE TABLE "recurring_payslip_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recurring_payslip_id" uuid NOT NULL,
	"description" text NOT NULL,
	"type" text DEFAULT 'earning' NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recurring_invoices" ADD COLUMN "payment_terms_days" integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE "recurring_invoices" ADD COLUMN "last_generated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payslips" ADD COLUMN "recurring_payslip_id" uuid;--> statement-breakpoint
ALTER TABLE "payslips" ADD COLUMN "is_auto_generated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "recurring_payslips" ADD CONSTRAINT "recurring_payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_payslip_items" ADD CONSTRAINT "recurring_payslip_items_recurring_payslip_id_recurring_payslips_id_fk" FOREIGN KEY ("recurring_payslip_id") REFERENCES "public"."recurring_payslips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_recurring_payslip_id_recurring_payslips_id_fk" FOREIGN KEY ("recurring_payslip_id") REFERENCES "public"."recurring_payslips"("id") ON DELETE set null ON UPDATE no action;