"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/types";
import { getLedgerCategory, ledgerTotals, type LedgerEntry, type LedgerKind, type LedgerSyncInfo } from "@/lib/ledger";
import { LedgerSyncStatus } from "./sync-button";

const PAGE_SIZES = [25, 50, 100];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const lkr = (n: number) => formatCurrency(n, "LKR");

function formatDate(d: string | null) {
  if (!d) return null;
  const [y, m, day] = d.split("-").map(Number);
  return `${MONTHS[m - 1]} ${day}, ${y}`;
}

export function AccountsView({
  entries,
  sync,
  sheetUrl,
}: {
  entries: LedgerEntry[];
  sync: LedgerSyncInfo;
  sheetUrl: string | null;
}) {
  const [kind, setKind] = useState<LedgerKind>("expense");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  // "all" | "YYYY-MM" | "nodate" — opens on the current month.
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const ofKind = useMemo(() => entries.filter((e) => e.kind === kind), [entries, kind]);

  const categories = useMemo(() => [...new Set(ofKind.map((e) => e.category))].sort(), [ofKind]);
  // Always offer the current month (and the selected one), even before it has entries.
  const periods = useMemo(() => {
    const d = new Date();
    const thisMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const set = new Set(ofKind.flatMap((e) => (e.entryDate ? [e.entryDate.slice(0, 7)] : [])));
    set.add(thisMonth);
    return [...set].sort().reverse();
  }, [ofKind]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ofKind
      .filter((e) => category === "all" || e.category === category)
      .filter((e) =>
        period === "all" ? true : period === "nodate" ? !e.entryDate : e.entryDate?.startsWith(period),
      )
      .filter((e) => !q || e.description.toLowerCase().includes(q))
      .sort((a, b) => (b.entryDate ?? "").localeCompare(a.entryDate ?? "") || b.sheetRow - a.sheetRow);
  }, [ofKind, query, category, period]);

  // "Last year closing" is a carried-forward balance, not spending — keep it out of the footer sum.
  const total = rows.reduce((s, e) => (e.category === "opening" ? s : s + e.amount), 0);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const firstShown = rows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastShown = Math.min(currentPage * pageSize, rows.length);
  const totals = useMemo(() => ledgerTotals(entries), [entries]);
  const undated = entries.filter((e) => !e.entryDate);

  const resetPage = () => setPage(1);
  const failed = Boolean(sync.lastError) && sync.lastAttemptAt !== sync.lastSuccessAt;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-medium tracking-tight sm:text-2xl">Accounts</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Live from the FD-Accounts sheet. Edit entries there and they show up here automatically.
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          {sheetUrl && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground sm:px-3"
            >
              Open sheet <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <LedgerSyncStatus info={sync} />
        </div>
      </div>

      {failed && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300 sm:p-4 sm:text-sm">
          <AlertTriangle className="mr-1.5 inline h-4 w-4 -translate-y-px" />
          <span className="break-words">Last sync failed: {sync.lastError}</span>
        </div>
      )}

      {/* Totals: one compact card on phones, three cards from sm up */}
      <div className="rounded-xl border border-border bg-card p-4 sm:hidden">
        <p className="text-xs text-muted-foreground">Current balance</p>
        <p className={cn("mt-1 font-mono text-2xl font-semibold tracking-tight", totals.balance < 0 && "text-red-400")}>
          {lkr(totals.balance)}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">Income · {sync.incomeRows}</p>
            <p className="mt-0.5 truncate font-mono text-sm font-semibold text-primary">{lkr(totals.income)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">Expenditure · {sync.expenseRows}</p>
            <p className="mt-0.5 truncate font-mono text-sm font-semibold text-amber-400">{lkr(totals.expense)}</p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">Includes last year closing {lkr(totals.opening)}</p>
      </div>
      <div className="hidden gap-3 sm:grid sm:grid-cols-3">
        <Summary label="Total income" value={lkr(totals.income)} hint={`${sync.incomeRows} rows`} />
        <Summary
          label="Total expenditure"
          value={lkr(totals.expense)}
          hint={`${sync.expenseRows} rows · excl. last year closing`}
        />
        <Summary
          label="Current balance"
          value={lkr(totals.balance)}
          hint={`Last year closing ${lkr(totals.opening)} + income − expenditure`}
          negative={totals.balance < 0}
        />
      </div>

      {undated.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 sm:p-4">
          <p className="text-xs font-medium text-amber-300 sm:text-sm">
            <AlertTriangle className="mr-1.5 inline h-4 w-4 -translate-y-px" />
            {undated.length} row{undated.length > 1 ? "s have" : " has"} no date in the sheet
          </p>
          <p className="mt-1 break-words text-xs text-muted-foreground">
            They count toward totals but not toward any month. Fix them in the sheet:{" "}
            {undated.map((e) => `${e.kind} row ${e.sheetRow} (${e.description})`).join(", ")}
          </p>
        </div>
      )}

      {/* Tabs + filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={kind}
          onValueChange={(v) => {
            setKind(v as LedgerKind);
            setCategory("all");
            resetPage();
          }}
        >
          <TabsList className="grid w-full grid-cols-2 lg:inline-flex lg:w-auto">
            <TabsTrigger value="expense">Expenses</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row">
          <div className="relative col-span-2 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                resetPage();
              }}
              placeholder="Search description"
              className="h-10 pl-8 text-base sm:h-9 sm:text-sm"
            />
          </div>
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v);
              resetPage();
            }}
          >
            <SelectTrigger className="h-10 w-full min-w-0 text-xs bg-secondary border-border sm:h-9 sm:w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {getLedgerCategory(c).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={period}
            onValueChange={(v) => {
              setPeriod(v);
              resetPage();
            }}
          >
            <SelectTrigger className="h-10 w-full min-w-0 text-xs font-mono bg-secondary border-border sm:h-9 sm:w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {periods.map((p) => (
                <SelectItem key={p} value={p}>
                  {MONTHS[Number(p.slice(5, 7)) - 1]} {p.slice(0, 4)}
                </SelectItem>
              ))}
              <SelectItem value="nodate">No date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        {rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            {entries.length === 0 ? "No data yet. Run a sync." : "No entries match these filters."}
          </p>
        ) : (
          <>
            {/* Phones: card list */}
            <ul className="divide-y divide-border md:hidden">
              {pageRows.map((e) => {
                const cat = getLedgerCategory(e.category);
                return (
                  <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm leading-snug">{e.description}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <span className={cn(!e.entryDate && "text-amber-400")}>
                          {formatDate(e.entryDate) ?? "No date"}
                        </span>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: cat.color }} />
                          {cat.label}
                        </span>
                        {e.method && (
                          <>
                            <span aria-hidden>·</span>
                            <span>{e.method}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <p
                      className={cn(
                        "shrink-0 pt-px text-right font-mono text-sm font-semibold",
                        e.amount < 0 && "text-red-400",
                      )}
                    >
                      {lkr(e.amount)}
                    </p>
                  </li>
                );
              })}
            </ul>

            {/* Tablet & desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="w-[1%] text-xs font-medium text-muted-foreground">#</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Date</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Description</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Category</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((e) => {
                    const cat = getLedgerCategory(e.category);
                    return (
                      <TableRow key={e.id} className="border-b border-border">
                        <TableCell className="font-mono text-xs text-muted-foreground" title={`Sheet row ${e.sheetRow}`}>
                          {e.entryNumber ?? "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDate(e.entryDate) ?? <span className="text-amber-400">No date</span>}
                        </TableCell>
                        <TableCell className="max-w-[420px] text-sm">
                          <span className="line-clamp-2">{e.description}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className="whitespace-nowrap rounded-full border-0 px-2 py-0 text-[10px] font-medium"
                            style={{ background: `${cat.color}22`, color: cat.color }}
                          >
                            {cat.label}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "whitespace-nowrap text-right font-mono text-sm font-semibold",
                            e.amount < 0 && "text-red-400",
                          )}
                        >
                          {lkr(e.amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Footer: total + pagination */}
            <div className="space-y-3 border-t border-border bg-card px-4 py-3 text-sm md:flex md:items-center md:justify-between md:gap-4 md:space-y-0">
              <div className="flex items-center justify-between gap-3 md:order-3 md:justify-end">
                <span className="text-xs text-muted-foreground md:hidden">{rows.length} entries</span>
                <span>
                  <span className="text-xs text-muted-foreground">Total </span>
                  <span className="font-mono font-semibold">{lkr(total)}</span>
                </span>
              </div>
              <div className="hidden items-center gap-3 text-muted-foreground md:order-1 md:flex">
                <span className="whitespace-nowrap">
                  {firstShown}–{lastShown} of {rows.length}
                </span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    resetPage();
                  }}
                >
                  <SelectTrigger className="h-8 w-[110px] text-xs bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} / page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {pageCount > 1 && (
                <div className="flex items-center justify-between gap-1 md:order-2 md:justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 md:h-8 md:w-8 md:border-0 md:bg-transparent md:px-0"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="ml-1 md:hidden">Prev</span>
                  </Button>
                  <span className="font-mono text-xs text-muted-foreground md:hidden">
                    Page {currentPage} of {pageCount}
                  </span>
                  <div className="hidden items-center gap-1 md:flex">
                    {pageNumbers(currentPage, pageCount).map((n, i) =>
                      n === null ? (
                        <span key={`gap-${i}`} className="px-1 text-muted-foreground">
                          …
                        </span>
                      ) : (
                        <Button
                          key={n}
                          variant={n === currentPage ? "secondary" : "ghost"}
                          size="sm"
                          className="h-8 min-w-8 px-2 font-mono text-xs"
                          onClick={() => setPage(n)}
                          aria-current={n === currentPage ? "page" : undefined}
                        >
                          {n}
                        </Button>
                      ),
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 md:h-8 md:w-8 md:border-0 md:bg-transparent md:px-0"
                    disabled={currentPage >= pageCount}
                    onClick={() => setPage(currentPage + 1)}
                    aria-label="Next page"
                  >
                    <span className="mr-1 md:hidden">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** 1 … 4 5 6 … 13 — at most 7 slots, null = gap. */
function pageNumbers(current: number, count: number): (number | null)[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const pages = new Set([1, count, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((n) => pages.add(n));
  if (current >= count - 2) [count - 3, count - 2, count - 1].forEach((n) => pages.add(n));
  const sorted = [...pages].filter((n) => n >= 1 && n <= count).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push(null);
    out.push(n);
  });
  return out;
}

function Summary({ label, value, hint, negative }: { label: string; value: string; hint: string; negative?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1.5 truncate font-mono text-xl font-semibold tracking-tight", negative && "text-red-400")}>
        {value}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
