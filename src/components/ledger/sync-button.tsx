"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LedgerSyncInfo } from "@/lib/ledger";
import { syncLedgerNow } from "@/server/actions/ledger";

/** Opening a page whose data is older than this triggers a quiet background sync. */
const STALE_MS = 2 * 60 * 1000;
/** An open page re-reads the (server-synced) data this often. */
const REFRESH_MS = 60 * 1000;

export function LedgerSyncStatus({ info, className }: { info: LedgerSyncInfo; className?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [, setTick] = useState(0); // re-renders the "x minutes ago" label
  const autoSynced = useRef(false);

  function runSync(quiet: boolean) {
    startTransition(async () => {
      try {
        const r = await syncLedgerNow({ force: !quiet });
        if (!r.ok) {
          if (!quiet) toast.error(r.error ?? "Sync failed");
        } else if (!quiet && !r.skipped) {
          toast.success(`Synced ${r.income} income and ${r.expense} expense rows`);
          if (r.warnings.length > 0) toast.info(`${r.warnings.length} row(s) need attention in the sheet`);
        }
        router.refresh();
      } catch (err) {
        if (!quiet) toast.error(err instanceof Error ? err.message : "Sync failed");
      }
    });
  }

  // Auto-sync once on open if the data is stale.
  useEffect(() => {
    if (!info.configured || autoSynced.current) return;
    const last = info.lastSuccessAt ? new Date(info.lastSuccessAt).getTime() : 0;
    if (Date.now() - last > STALE_MS) {
      autoSynced.current = true;
      runSync(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info.configured, info.lastSuccessAt]);

  // Keep an open page fresh: pick up the scheduler's syncs without a reload.
  useEffect(() => {
    if (!info.configured) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
      setTick((t) => t + 1);
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [info.configured, router]);

  const failed = Boolean(info.lastError) && info.lastAttemptAt !== info.lastSuccessAt;

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <span
        className={cn("truncate text-xs", failed ? "text-red-400" : "text-muted-foreground")}
        title={failed ? (info.lastError ?? undefined) : "Updates automatically from the sheet"}
      >
        {failed && <AlertTriangle className="mr-1 inline h-3 w-3 -translate-y-px" />}
        {!info.configured
          ? "Sheet not connected"
          : isPending
            ? "Syncing…"
            : info.lastSuccessAt
              ? `Synced ${formatDistanceToNow(new Date(info.lastSuccessAt), { addSuffix: true })}`
              : "Never synced"}
        {failed && !isPending && " · last sync failed"}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 shrink-0 px-0 min-[400px]:w-auto min-[400px]:px-3"
        onClick={() => runSync(false)}
        disabled={isPending || !info.configured}
        aria-label="Sync now"
      >
        <RefreshCw className={cn("h-3.5 w-3.5 min-[400px]:mr-1.5", isPending && "animate-spin")} />
        <span className="hidden min-[400px]:inline">{isPending ? "Syncing…" : "Sync now"}</span>
      </Button>
    </div>
  );
}
