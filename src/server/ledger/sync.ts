import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { ledgerEntries, ledgerSyncState } from "@/server/db/schema";
import { fetchLedgerRows, isLedgerConfigured } from "./google";
import { parseLedgerSheet } from "./parse";

export type LedgerSyncResult = {
  ok: boolean;
  income: number;
  expense: number;
  warnings: string[];
  error?: string;
};

/**
 * Pull the sheet and replace `ledger_entries` wholesale in one transaction.
 * The sheet is the source of truth, so edits and deletions there show up here
 * on the next sync. A parse failure (or an empty result) leaves the previous
 * data untouched and records the error.
 */
export async function syncLedger(): Promise<LedgerSyncResult> {
  if (!isLedgerConfigured()) {
    return { ok: false, income: 0, expense: 0, warnings: [], error: "Accounts sheet sync is not configured" };
  }

  const attemptAt = new Date();
  try {
    const rows = await fetchLedgerRows();
    const { entries, warnings } = parseLedgerSheet(rows);
    if (entries.length === 0) throw new Error("The sheet returned no rows with amounts; keeping the previous data");

    const income = entries.filter((e) => e.kind === "income").length;
    const expense = entries.length - income;

    await db.transaction(async (tx) => {
      // Serialise concurrent syncs (scheduler tick + "Sync now" click).
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('ledger_sync'))`);
      await tx.delete(ledgerEntries);
      await tx.insert(ledgerEntries).values(
        entries.map((e) => ({
          ...e,
          amount: e.amount.toFixed(2),
          syncedAt: attemptAt,
        })),
      );
      await tx
        .insert(ledgerSyncState)
        .values({
          id: "default",
          lastAttemptAt: attemptAt,
          lastSuccessAt: attemptAt,
          lastError: null,
          incomeRows: income,
          expenseRows: expense,
        })
        .onConflictDoUpdate({
          target: ledgerSyncState.id,
          set: {
            lastAttemptAt: attemptAt,
            lastSuccessAt: attemptAt,
            lastError: null,
            incomeRows: income,
            expenseRows: expense,
          },
        });
    });

    return { ok: true, income, expense, warnings };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .insert(ledgerSyncState)
      .values({ id: "default", lastAttemptAt: attemptAt, lastError: message })
      .onConflictDoUpdate({ target: ledgerSyncState.id, set: { lastAttemptAt: attemptAt, lastError: message } })
      .catch(() => {});
    return { ok: false, income: 0, expense: 0, warnings: [], error: message };
  }
}
