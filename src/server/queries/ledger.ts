import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { ledgerEntries, ledgerSyncState } from "@/server/db/schema";
import { isLedgerConfigured } from "@/server/ledger/google";
import type { LedgerEntry, LedgerSyncInfo } from "@/lib/ledger";

/** All mirrored sheet rows (a few hundred per year — filtered client-side). */
export async function listLedgerEntries(): Promise<LedgerEntry[]> {
  const rows = await db
    .select()
    .from(ledgerEntries)
    .orderBy(asc(ledgerEntries.kind), asc(ledgerEntries.sheetRow));
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    sheetRow: r.sheetRow,
    entryNumber: r.entryNumber,
    entryDate: r.entryDate,
    description: r.description,
    sheetType: r.sheetType,
    category: r.category,
    amount: Number(r.amount),
    method: r.method,
  }));
}

export async function getLedgerSyncInfo(): Promise<LedgerSyncInfo> {
  const [row] = await db.select().from(ledgerSyncState).where(eq(ledgerSyncState.id, "default"));
  return {
    configured: isLedgerConfigured(),
    lastAttemptAt: row?.lastAttemptAt?.toISOString() ?? null,
    lastSuccessAt: row?.lastSuccessAt?.toISOString() ?? null,
    lastError: row?.lastError ?? null,
    incomeRows: row?.incomeRows ?? 0,
    expenseRows: row?.expenseRows ?? 0,
  };
}
