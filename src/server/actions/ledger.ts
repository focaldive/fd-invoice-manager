"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth/session";
import { syncLedger, type LedgerSyncResult } from "@/server/ledger/sync";
import { getLedgerSyncInfo } from "@/server/queries/ledger";

/** Skip automatic (non-forced) syncs if one succeeded this recently. */
const MIN_AUTO_INTERVAL_MS = 60 * 1000;

/**
 * "Sync now" (force) and the quiet sync a page fires when its data is stale.
 * Quiet syncs from several open tabs collapse into one per minute.
 */
export async function syncLedgerNow(opts?: { force?: boolean }): Promise<LedgerSyncResult & { skipped?: boolean }> {
  await requireSession();
  if (!opts?.force) {
    const info = await getLedgerSyncInfo();
    const last = info.lastSuccessAt ? new Date(info.lastSuccessAt).getTime() : 0;
    if (Date.now() - last < MIN_AUTO_INTERVAL_MS) {
      return { ok: true, income: info.incomeRows, expense: info.expenseRows, warnings: [], skipped: true };
    }
  }
  const result = await syncLedger();
  revalidatePath("/");
  revalidatePath("/accounts");
  return result;
}
