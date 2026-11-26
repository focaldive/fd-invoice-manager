import { pgTable, uuid, text, numeric, date, integer, timestamp, index } from "drizzle-orm/pg-core";

export const ledgerKinds = ["income", "expense"] as const;
export type LedgerKind = (typeof ledgerKinds)[number];

/**
 * Read-only mirror of the FD-Accounts Google Sheet. The sheet is the source
 * of truth: every sync replaces all rows, so nothing in the app writes here
 * except `server/ledger/sync.ts`.
 */
export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: text("kind", { enum: ledgerKinds }).notNull(),
    /** 1-based row in the sheet, so a problem row can be found and fixed there. */
    sheetRow: integer("sheet_row").notNull(),
    entryNumber: integer("entry_number"),
    /** Null when the sheet cell is empty or unparseable — still counts toward totals. */
    entryDate: date("entry_date"),
    description: text("description").notNull(),
    /** The sheet's own "Type" column (income only), normalised. */
    sheetType: text("sheet_type"),
    /** Derived category (see server/ledger/categorize.ts) or the sheet's Category column if present. */
    category: text("category").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    method: text("method"),
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("ledger_entries_kind_date_idx").on(t.kind, t.entryDate)],
);

/** Single-row table (id = 'default') describing the last sync. */
export const ledgerSyncState = pgTable("ledger_sync_state", {
  id: text("id").primaryKey().default("default"),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastError: text("last_error"),
  incomeRows: integer("income_rows").notNull().default(0),
  expenseRows: integer("expense_rows").notNull().default(0),
});
