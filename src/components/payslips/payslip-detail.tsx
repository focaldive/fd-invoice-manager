"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Download,
  Pencil,
  CheckCircle,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { generatePayslipPDF } from "@/lib/payslip-pdf";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  getMonthLabel,
  getPaymentModeLabel,
  getPayslipStatusInfo,
} from "@/lib/types";
import { setPayslipStatus, deletePayslip } from "@/server/actions/payslips";
import type { getPayslipFull } from "@/server/queries/payslips";

type FullPayslip = NonNullable<Awaited<ReturnType<typeof getPayslipFull>>>;

export function PayslipDetail({ payslip }: { payslip: FullPayslip }) {
  const router = useRouter();
  const [confirmPaid, setConfirmPaid] = useState(false);
  const [isPending, startTransition] = useTransition();

  const items = payslip.items;
  const employee = payslip.employee;
  const settings = payslip.settings;
  const fmt = (n: number) => formatCurrency(n, payslip.currency);

  function handleMarkAsPaid() {
    startTransition(async () => {
      try {
        await setPayslipStatus(payslip.id, "paid");
        toast.success("Marked as paid");
        setConfirmPaid(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  function handleSetDraft() {
    startTransition(async () => {
      try {
        await setPayslipStatus(payslip.id, "draft");
        toast.success("Moved back to draft");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  function handleDelete() {
    if (!confirm("Delete this payslip? This cannot be undone.")) return;
    startTransition(async () => {
      try {
        await deletePayslip(payslip.id);
        toast.success("Payslip deleted");
        router.push("/payslips");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  async function handleDownloadPDF() {
    try {
      await generatePayslipPDF({ ...payslip, items, employee: employee ?? undefined }, settings);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate PDF");
    }
  }

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/payslips">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-3xl font-semibold tracking-tight font-mono">{payslip.slipNumber}</h1>
                <Badge
                  className={cn(
                    "text-[11px] font-medium px-2.5 py-0.5 rounded-full border-0",
                    payslip.status === "paid" ? "bg-primary/20 text-primary" : "bg-blue-500/20 text-blue-400",
                  )}
                >
                  {getPayslipStatusInfo(payslip.status).label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {employee ? (
                  <Link href={`/employees/${employee.id}`} className="text-primary hover:underline">
                    {employee.name}
                  </Link>
                ) : (
                  "No employee"
                )}
                {" · "}
                {getMonthLabel(payslip.payPeriodMonth)} {payslip.payPeriodYear}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="h-9 rounded-full">
              <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
            </Button>
            {payslip.status === "draft" && (
              <>
                <Link href={`/payslips/${payslip.id}/edit`}>
                  <Button variant="outline" size="sm" className="h-9 rounded-full">
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                </Link>
                <Button size="sm" onClick={() => setConfirmPaid(true)} className="h-9 rounded-full">
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Mark as Paid
                </Button>
              </>
            )}
            {payslip.status === "paid" && (
              <Button variant="outline" size="sm" onClick={handleSetDraft} disabled={isPending} className="h-9 rounded-full">
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Move to Draft
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
              className="h-9 rounded-full text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">From</p>
                  <p className="text-sm font-semibold">{settings?.companyName || "—"}</p>
                  {settings?.companyAddress && <p className="text-sm text-muted-foreground mt-0.5">{settings.companyAddress}</p>}
                  {settings?.companyEmail && <p className="text-sm text-muted-foreground">{settings.companyEmail}</p>}
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Payee</p>
                  <p className="text-sm font-semibold">{employee?.name || "N/A"}</p>
                  {employee && <p className="text-sm text-muted-foreground mt-0.5 font-mono">{employee.employeeNumber}</p>}
                  {employee && <p className="text-sm text-muted-foreground">{employee.designation} · {employee.department}</p>}
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3 border-t border-border pt-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Payment Date</span>
                  <p className="text-sm font-medium mt-0.5">{new Date(payslip.paymentDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Payment Mode</span>
                  <p className="text-sm font-medium mt-0.5">{getPaymentModeLabel(payslip.paymentMode)}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Currency</span>
                  <p className="text-sm font-mono font-medium mt-0.5">{payslip.currency}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-sm font-semibold">Earnings & Deductions</h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="text-xs text-muted-foreground font-medium">Description</TableHead>
                      <TableHead className="text-xs text-muted-foreground font-medium">Type</TableHead>
                      <TableHead className="text-right text-xs text-muted-foreground font-medium">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="border-b border-border">
                        <TableCell className="text-sm">{item.description}</TableCell>
                        <TableCell className="text-sm">
                          <span className={cn("capitalize", item.type === "deduction" ? "text-red-400" : "text-muted-foreground")}>
                            {item.type}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono font-semibold">
                          {item.type === "deduction" ? `-${fmt(Number(item.amount))}` : fmt(Number(item.amount))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {payslip.notes && (
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-sm font-semibold mb-3">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{payslip.notes}</p>
              </div>
            )}

            {payslip.authorizedByName && (
              <div className="rounded-xl border border-border bg-card p-6">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Authorized By</p>
                <p className="text-sm font-semibold">{payslip.authorizedByName}</p>
                {payslip.authorizedByTitle && <p className="text-sm text-muted-foreground">{payslip.authorizedByTitle}</p>}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 sticky top-24 space-y-3">
              <h3 className="text-sm font-semibold mb-4">Summary</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gross Pay</span>
                <span className="font-mono">{fmt(Number(payslip.grossPay))}</span>
              </div>
              {Number(payslip.totalDeductions) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Deductions</span>
                  <span className="font-mono">-{fmt(Number(payslip.totalDeductions))}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between font-semibold">
                <span>Net Pay</span>
                <span className="font-mono text-lg">{fmt(Number(payslip.netPay))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmPaid} onOpenChange={setConfirmPaid}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Paid</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this payslip as paid? This will update its status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsPaid} disabled={isPending}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
