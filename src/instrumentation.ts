/**
 * Runs once when the Next.js server boots. Starts the hourly recurring
 * invoice/payslip generator in the Node.js runtime (not edge, not during
 * `next build`). Set RECURRING_SCHEDULER=off to disable it, e.g. when an
 * external cron is used instead.
 *
 * The Node-only import MUST stay inside a positive
 * `process.env.NEXT_RUNTIME === "nodejs"` block: webpack only dead-code
 * eliminates it from the edge instrumentation bundle in that form. An early
 * `return` for non-node runtimes still pulls `pg` (fs/path/stream) into the
 * edge build and fails compilation.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.NEXT_PHASE === "phase-production-build") return;

    if (process.env.RECURRING_SCHEDULER !== "off") {
      const { startRecurringScheduler } = await import("@/server/recurring/scheduler");
      startRecurringScheduler();
    }

    // Accounts sheet → ledger_entries pull (no-op unless LEDGER_SHEET_ID + credentials are set).
    if (process.env.LEDGER_SYNC !== "off") {
      const { startLedgerScheduler } = await import("@/server/ledger/scheduler");
      startLedgerScheduler();
    }
  }
}
