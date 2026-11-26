CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"sheet_row" integer NOT NULL,
	"entry_number" integer,
	"entry_date" date,
	"description" text NOT NULL,
	"sheet_type" text,
	"category" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"method" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_sync_state" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_error" text,
	"income_rows" integer DEFAULT 0 NOT NULL,
	"expense_rows" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ledger_entries_kind_date_idx" ON "ledger_entries" USING btree ("kind","entry_date");