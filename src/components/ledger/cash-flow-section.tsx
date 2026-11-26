"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Landmark, Scale, Sheet } from "lucide-react";
import { BarChart } from "@/components/charts/bar-chart";
import { Bar } from "@/components/charts/bar";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { Grid } from "@/components/charts/grid";
import { YAxis } from "@/components/charts/y-axis";
import { ChartTooltip } from "@/components/charts/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/types";
import { getLedgerCategory, isOperating, ledgerTotals, type LedgerEntry, type LedgerSyncInfo } from "@/lib/ledger";
import { LedgerSyncStatus } from "./sync-button";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const lkr = (n: number) => formatCurrency(n, "LKR");
const compact = (v: number) => {
  const a = Math.abs(v);
  return a >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : a >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`;
};

function inPeriod(e: LedgerEntry, year: number, month: number) {
  if (!e.entryDate) return false;
  const y = Number(e.entryDate.slice(0, 4));
  const m = Number(e.entryDate.slice(5, 7));
  return y === year && (month === 0 || m === month);
}

/** Dashboard block fed by the FD-Accounts sheet mirror (ledger_entries). */
export function CashFlowSection({ entries, sync }: { entries: LedgerEntry[]; sync: LedgerSyncInfo }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const years = useMemo(() => {
    const s = new Set(entries.flatMap((e) => (e.entryDate ? [Number(e.entryDate.slice(0, 4))] : [])));
    s.add(now.getFullYear());
    return [...s].sort((a, b) => b - a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  const stats = useMemo(() => {
    // Balance mirrors the sheet's "Current Balance": every row, dated or not, capital and opening included.
    const { balance } = ledgerTotals(entries);
    const period = entries.filter((e) => isOperating(e) && inPeriod(e, year, month));
    const income = period.filter((e) => e.kind === "income").reduce((s, e) => s + e.amount, 0);
    const expense = period.filter((e) => e.kind === "expense").reduce((s, e) => s + e.amount, 0);

    const byCategory = new Map<string, number>();
    for (const e of period) if (e.kind === "expense") byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
    const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

    const monthly = MONTHS.map((m, idx) => {
      const rows = entries.filter((e) => isOperating(e) && inPeriod(e, year, idx + 1));
      return {
        month: m,
        income: rows.filter((e) => e.kind === "income").reduce((s, e) => s + e.amount, 0),
        expense: rows.filter((e) => e.kind === "expense").reduce((s, e) => s + e.amount, 0),
      };
    });
    return { balance, income, expense, net: income - expense, categories, monthly };
  }, [entries, year, month]);

  const periodLabel = month === 0 ? `${year}` : `${MONTHS[month - 1]} ${year}`;

  if (!sync.configured && entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <Sheet className="mx-auto h-8 w-8 text-muted-foreground/60" />
        <p className="mt-3 text-sm font-medium">Accounts sheet not connected</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Set <code className="font-mono">LEDGER_SHEET_ID</code> and the Google service account credentials to show
          cash flow here.
        </p>
      </div>
    );
  }

  const maxCategory = stats.categories[0]?.[1] ?? 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-medium tracking-tight">Cash Flow</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            From the FD-Accounts sheet ·{" "}
            <Link href="/accounts" className="text-primary hover:underline">
              view all entries
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LedgerSyncStatus info={sync} />
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="h-8 w-[110px] text-[11px] font-mono bg-secondary border-border px-2.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">All Months</SelectItem>
              {MONTHS.map((m, idx) => (
                <SelectItem key={m} value={String(idx + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="h-8 w-[80px] text-[11px] font-mono bg-secondary border-border px-2.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Cash Balance"
          value={lkr(stats.balance)}
          hint="All time, matches the sheet"
          icon={Landmark}
          tone={stats.balance < 0 ? "red" : "green"}
        />
        <StatCard label="Income" value={lkr(stats.income)} hint={`${periodLabel} · excl. capital`} icon={ArrowDownLeft} tone="green" />
        <StatCard label="Expenses" value={lkr(stats.expense)} hint={periodLabel} icon={ArrowUpRight} tone="amber" />
        <StatCard
          label="Net"
          value={lkr(stats.net)}
          hint={stats.net >= 0 ? `Profit · ${periodLabel}` : `Loss · ${periodLabel}`}
          icon={Scale}
          tone={stats.net < 0 ? "red" : "blue"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Income vs Expenses</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{year} by month · excl. capital &amp; opening balance</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--chart-1)]" /> Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> Expenses
              </span>
            </div>
          </div>
          <BarChart
            key={year}
            data={stats.monthly}
            xDataKey="month"
            aspectRatio="5 / 2"
            barGap={0.3}
            margin={{ left: 48 }}
            className="w-full"
          >
            <Grid horizontal numTicksRows={4} />
            <Bar dataKey="income" fill="var(--chart-1)" lineCap={4} fadedOpacity={0.35} />
            <Bar dataKey="expense" fill="#fbbf24" lineCap={4} fadedOpacity={0.35} />
            <YAxis numTicks={4} formatValue={(v) => `Rs${compact(v)}`} />
            <BarXAxis showAllLabels />
            <ChartTooltip
              showDatePill={false}
              rows={(p) => [
                { color: "var(--chart-1)", label: `Income · ${p.month}`, value: lkr(Number(p.income)) },
                { color: "#fbbf24", label: `Expenses · ${p.month}`, value: lkr(Number(p.expense)) },
                { color: "transparent", label: "Net", value: lkr(Number(p.income) - Number(p.expense)) },
              ]}
            />
          </BarChart>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold">Where the money went</h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">Expenses by category · {periodLabel}</p>
          {stats.categories.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No expenses in this period</p>
          ) : (
            <ul className="space-y-3">
              {stats.categories.map(([cat, amount]) => {
                const info = getLedgerCategory(cat);
                const pct = stats.expense > 0 ? (amount / stats.expense) * 100 : 0;
                return (
                  <li key={cat}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate">{info.label}</span>
                      <span className="shrink-0 font-mono text-xs">
                        {lkr(amount)} <span className="text-muted-foreground">· {pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${maxCategory > 0 ? (amount / maxCategory) * 100 : 0}%`, background: info.color }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

const TONES = {
  green: ["bg-primary/10", "text-primary"],
  amber: ["bg-amber-400/10", "text-amber-400"],
  red: ["bg-red-400/10", "text-red-400"],
  blue: ["bg-blue-400/10", "text-blue-400"],
} as const;

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof TONES;
}) {
  const [bg, fg] = TONES[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", bg)}>
          <Icon className={cn("h-4 w-4", fg)} />
        </div>
      </div>
      <p className={cn("mt-3 text-2xl font-semibold tracking-tight font-mono", tone === "red" && "text-red-400")}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
