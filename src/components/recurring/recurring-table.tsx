"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RotateCcw, Pause, Play, Trash2, Plus, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  computeNetPay,
  formatCurrency,
  getCategoryLabel,
  parseDateString,
} from "@/lib/types";
import {
  setRecurringActive,
  setRecurringDayOfMonth,
  deleteRecurringTemplate,
  runRecurringNow,
  type RecurringKind,
} from "@/server/actions/recurring";
import type {
  listRecurringTemplates,
  listRecurringPayslipTemplates,
} from "@/server/queries/recurring";

type InvoiceTemplate = Awaited<ReturnType<typeof listRecurringTemplates>>[number];
type PayslipTemplate = Awaited<ReturnType<typeof listRecurringPayslipTemplates>>[number];

/** Common shape both template kinds are rendered from. */
type Row = {
  kind: RecurringKind;
  id: string;
  name: string;
  href: string | null;
  detail: string;
  amount: string;
  dayOfMonth: number;
  generatedCount: number;
  isActive: boolean;
  nextGenerationDate: string;
};

function formatDate(value: string) {
  return parseDateString(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function invoiceRow(t: InvoiceTemplate): Row {
  const subtotal = t.items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
  const tax = subtotal * (Number(t.taxPercentage) / 100);
  const discount =
    Number(t.discountPercentage) > 0
      ? subtotal * (Number(t.discountPercentage) / 100)
      : Number(t.discountAmount);
  return {
    kind: "invoice",
    id: t.id,
    name: t.client?.name ?? "—",
    href: t.client ? `/clients/${t.client.id}` : null,
    detail: getCategoryLabel(t.category),
    amount: formatCurrency(subtotal + tax - discount, t.currency),
    dayOfMonth: t.dayOfMonth,
    generatedCount: t.generatedCount,
    isActive: t.isActive,
    nextGenerationDate: t.nextGenerationDate,
  };
}

function payslipRow(t: PayslipTemplate): Row {
  const { netPay } = computeNetPay(t.items.map((i) => ({ type: i.type, amount: Number(i.amount) })));
  return {
    kind: "payslip",
    id: t.id,
    name: t.employee?.name ?? "—",
    href: t.employee ? `/employees/${t.employee.id}` : null,
    detail:
      t.employee?.status === "inactive"
        ? "Employee inactive — skipped"
        : t.employee?.designation ?? "",
    amount: formatCurrency(netPay, t.currency),
    dayOfMonth: t.dayOfMonth,
    generatedCount: t.generatedCount,
    isActive: t.isActive,
    nextGenerationDate: t.nextGenerationDate,
  };
}

export function RecurringTable({
  templates,
  payslipTemplates,
}: {
  templates: InvoiceTemplate[];
  payslipTemplates: PayslipTemplate[];
}) {
  const [deleteTarget, setDeleteTarget] = useState<{ kind: RecurringKind; id: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleActive(row: Row) {
    startTransition(async () => {
      try {
        await setRecurringActive(row.kind, row.id, !row.isActive);
        toast.success(row.isActive ? "Schedule paused" : "Schedule resumed");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update");
      }
    });
  }

  function changeDay(row: Row, day: number) {
    startTransition(async () => {
      try {
        await setRecurringDayOfMonth(row.kind, row.id, day);
        toast.success(`Now runs on day ${day} of each month`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update");
      }
    });
  }

  function runNow() {
    startTransition(async () => {
      try {
        const r = await runRecurringNow();
        if (r.errors.length > 0) toast.error(`Some schedules failed: ${r.errors[0]}`);
        if (r.invoices + r.payslips === 0) {
          toast.info(
            r.skipped.length > 0 ? `Nothing generated — ${r.skipped.join("; ")}` : "Nothing is due yet",
          );
        } else {
          toast.success(`Generated ${r.invoices} invoice(s) and ${r.payslips} payslip(s) as drafts`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to run");
      }
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startTransition(async () => {
      try {
        await deleteRecurringTemplate(target.kind, target.id);
        toast.success("Recurring schedule deleted");
        setDeleteTarget(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  function renderSection(opts: {
    title: string;
    nameLabel: string;
    detailLabel: string;
    rows: Row[];
    emptyText: string;
    newHref: string;
    newLabel: string;
  }) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{opts.title}</h2>
          <Link href={opts.newHref}>
            <Button size="sm" variant="outline" className="h-8">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> {opts.newLabel}
            </Button>
          </Link>
        </div>
        {opts.rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border text-center py-10 px-4">
            <RotateCcw className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground/80 text-xs max-w-sm mx-auto">{opts.emptyText}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="text-xs text-muted-foreground font-medium">{opts.nameLabel}</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">{opts.detailLabel}</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">Amount</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-center">Day</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-center">Generated</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">Status</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">Next run</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opts.rows.map((row) => (
                  <TableRow key={row.id} className="group border-b border-border hover:bg-secondary/50">
                    <TableCell className="text-sm font-medium">
                      {row.href ? (
                        <Link href={row.href} className="hover:underline">
                          {row.name}
                        </Link>
                      ) : (
                        row.name
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.detail}</TableCell>
                    <TableCell className="text-sm font-mono text-right whitespace-nowrap">{row.amount}</TableCell>
                    <TableCell className="text-center">
                      <Select
                        value={String(row.dayOfMonth)}
                        onValueChange={(v) => changeDay(row, Number(v))}
                        disabled={isPending}
                      >
                        <SelectTrigger className="h-8 w-[70px] mx-auto font-mono text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                            <SelectItem key={d} value={String(d)}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-center">{row.generatedCount}</TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "text-[11px] font-medium px-2.5 py-0.5 rounded-full border-0",
                          row.isActive ? "bg-primary/20 text-primary" : "bg-amber-500/20 text-amber-400",
                        )}
                      >
                        {row.isActive ? "Active" : "Paused"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {row.isActive ? formatDate(row.nextGenerationDate) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleActive(row)}
                          disabled={isPending}
                          title={row.isActive ? "Pause" : "Resume"}
                        >
                          {row.isActive ? (
                            <Pause className="h-3.5 w-3.5 text-amber-400" />
                          ) : (
                            <Play className="h-3.5 w-3.5 text-primary" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDeleteTarget({ kind: row.kind, id: row.id })}
                          disabled={isPending}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Recurring</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monthly invoices and payslips. Due copies are generated automatically as drafts (checked hourly).
            </p>
          </div>
          <Button size="sm" className="h-9" onClick={runNow} disabled={isPending}>
            <Zap className="mr-1.5 h-3.5 w-3.5" /> Run due now
          </Button>
        </div>

        {renderSection({
          title: "Invoices",
          nameLabel: "Client",
          detailLabel: "Category",
          rows: templates.map(invoiceRow),
          emptyText: "Create or edit an invoice and switch on “Recurring Invoice” to bill a client every month.",
          newHref: "/invoices/new",
          newLabel: "New Invoice",
        })}

        {renderSection({
          title: "Payslips",
          nameLabel: "Employee",
          detailLabel: "Designation",
          rows: payslipTemplates.map(payslipRow),
          emptyText: "Create or edit a payslip and switch on “Recurring Payslip” to pay an employee every month.",
          newHref: "/payslips/new",
          newLabel: "New Payslip",
        })}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              No more {deleteTarget?.kind === "payslip" ? "payslips" : "invoices"} will be generated from this
              schedule. Documents it already generated are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isPending}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
