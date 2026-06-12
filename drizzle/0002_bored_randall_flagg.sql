CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_number" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"department" text NOT NULL,
	"designation" text NOT NULL,
	"joined_date" date,
	"status" text DEFAULT 'active' NOT NULL,
	"payment_mode" text DEFAULT 'bank_transfer' NOT NULL,
	"bank_name" text,
	"bank_account_name" text,
	"bank_account_number" text,
	"bank_branch" text,
	"basic_salary" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'LKR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_employee_number_unique" UNIQUE("employee_number")
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slip_number" text NOT NULL,
	"employee_id" uuid,
	"pay_period_month" integer NOT NULL,
	"pay_period_year" integer NOT NULL,
	"payment_date" date NOT NULL,
	"payment_mode" text DEFAULT 'bank_transfer' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'LKR' NOT NULL,
	"gross_pay" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_deductions" numeric(12, 2) DEFAULT '0' NOT NULL,
	"net_pay" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"authorized_by_name" text,
	"authorized_by_title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payslips_slip_number_unique" UNIQUE("slip_number"),
	CONSTRAINT "pay_period_month_range" CHECK ("payslips"."pay_period_month" >= 1 AND "payslips"."pay_period_month" <= 12)
);
--> statement-breakpoint
CREATE TABLE "payslip_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payslip_id" uuid NOT NULL,
	"description" text NOT NULL,
	"type" text DEFAULT 'earning' NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslip_items" ADD CONSTRAINT "payslip_items_payslip_id_payslips_id_fk" FOREIGN KEY ("payslip_id") REFERENCES "public"."payslips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employees_department_idx" ON "employees" USING btree ("department");--> statement-breakpoint
CREATE INDEX "employees_status_idx" ON "employees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payslips_employee_idx" ON "payslips" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "payslips_status_idx" ON "payslips" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payslips_period_idx" ON "payslips" USING btree ("pay_period_year","pay_period_month");