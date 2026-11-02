import "server-only";
import { runDueRecurring } from "@/server/recurring/generate";

/** How often the in-process scheduler checks for due templates. */
const INTERVAL_MS = 60 * 60 * 1000; // hourly
/** Small delay after boot so the server is serving before we hit the DB. */
const STARTUP_DELAY_MS = 15 * 1000;

const g = globalThis as unknown as { __fdRecurringTimer?: NodeJS.Timeout };

/**
 * Start the background recurring generator (idempotent — dev HMR or repeated
 * register() calls never start a second timer). Generation is itself
 * idempotent, so a missed tick just means the next one catches up.
 */
export function startRecurringScheduler() {
  if (g.__fdRecurringTimer) return;

  const tick = () => {
    runDueRecurring().catch((err) => {
      console.error("[recurring] scheduled run failed:", err);
    });
  };

  setTimeout(tick, STARTUP_DELAY_MS).unref();
  g.__fdRecurringTimer = setInterval(tick, INTERVAL_MS);
  g.__fdRecurringTimer.unref();
  console.log("[recurring] scheduler started (hourly)");
}
