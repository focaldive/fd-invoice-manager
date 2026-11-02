/**
 * Runs once when the Next.js server boots. Starts the hourly recurring
 * invoice/payslip generator in the Node.js runtime (not edge, not during
 * `next build`). Set RECURRING_SCHEDULER=off to disable it, e.g. when an
 * external cron is used instead.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.RECURRING_SCHEDULER === "off") return;

  const { startRecurringScheduler } = await import("@/server/recurring/scheduler");
  startRecurringScheduler();
}
