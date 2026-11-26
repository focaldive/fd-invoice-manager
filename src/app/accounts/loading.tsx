import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

/** Shown while the Accounts page loads; mirrors the phone and desktop layouts. */
export default function AccountsLoading() {
  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-36 sm:h-8 sm:w-40" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-36" />
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-3 rounded-xl border border-border bg-card p-4 sm:hidden">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-44" />
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
        <div className="hidden gap-3 sm:grid sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border bg-card p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>

        {/* Tabs + filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
          <Skeleton className="h-9 w-full lg:w-48" />
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Skeleton className="col-span-2 h-10 sm:h-9 sm:w-64" />
            <Skeleton className="h-10 sm:h-9 sm:w-44" />
            <Skeleton className="h-10 sm:h-9 sm:w-32" />
          </div>
        </div>

        {/* Rows: cards on phones, table rows from md up */}
        <div className="overflow-hidden rounded-xl border border-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-0 md:hidden">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="hidden items-center gap-6 border-b border-border px-4 py-3.5 last:border-0 md:flex"
            >
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-32 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
