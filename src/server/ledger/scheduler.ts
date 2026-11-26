import "server-only";
import { isLedgerConfigured } from "./google";
import { syncLedger } from "./sync";

const DEFAULT_INTERVAL_MINUTES = 10;
const STARTUP_DELAY_MS = 10 * 1000;

const g = globalThis as unknown as { __fdLedgerTimer?: NodeJS.Timeout };

/**
 * Background pull of the accounts sheet every LEDGER_SYNC_INTERVAL_MINUTES
 * (default 10). Idempotent across HMR / repeated register() calls. No-op when
 * the sheet isn't configured.
 */
export function startLedgerScheduler() {
  if (g.__fdLedgerTimer || !isLedgerConfigured()) return;

  const minutes = Math.max(1, Number(process.env.LEDGER_SYNC_INTERVAL_MINUTES) || DEFAULT_INTERVAL_MINUTES);
  const tick = () => {
    syncLedger()
      .then((r) => {
        if (!r.ok) console.error("[ledger] sync failed:", r.error);
      })
      .catch((err) => console.error("[ledger] sync crashed:", err));
  };

  setTimeout(tick, STARTUP_DELAY_MS).unref();
  g.__fdLedgerTimer = setInterval(tick, minutes * 60 * 1000);
  g.__fdLedgerTimer.unref();
  console.log(`[ledger] sheet sync started (every ${minutes} min)`);
}
