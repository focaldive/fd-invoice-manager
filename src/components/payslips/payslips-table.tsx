"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Plus,
  MoreHorizontal,
  Eye,
  Download,
  Pencil,
  CheckCircle,
  Trash2,
  LayoutGrid,
  List,
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
import {
  setPayslipStatus,
  deletePayslip,
  getPayslipItemsForPdf,
} from "@/server/actions/payslips";
import type { listPayslips } from "@/server/queries/payslips";
import type { getSettings } from "@/server/queries/settings";

type StatusTab = "all" | "paid" | "draft";
type Payslips = Awaited<ReturnType<typeof listPayslips>>;
type Payslip = Payslips[number];
type Settings = Awaited<ReturnType<typeof getSettings>>;

const tabs: { key: StatusTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "draft", label: "Draft" },
];

export function PayslipsTable({ payslips, settings }: { payslips: Payslips; settings: Settings }) {
  const router = useRouter();
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [confirmPaidId, setConfirmPaidId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleMarkAsPaid(id: string) {
    startTransition(async () => {
      try {
        await setPayslipStatus(id, "paid");
        toast.success("Marked as paid");
        setConfirmPaidId(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this payslip? This cannot be undone.")) return;
    startTransition(async () => {
      try {
        await deletePayslip(id);
        toast.success("Payslip deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  async function handleDownloadPdf(payslip: Payslip) {
    try {
      const items = await getPayslipItemsForPdf(payslip.id);
      await generatePayslipPDF({ ...payslip, items, employee: payslip.employee ?? undefined }, settings);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate PDF");
    }
  }

  const employees = Array.from(
    new Map(
      payslips.filter((p) => p.employee).map((p) => [p.employee!.id, p.employee!.name]),
    ),
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const filtered = payslips.filter((p) => {
    if (statusTab !== "all" && p.status !== statusTab) return false;
    if (employeeFilter !== "all" && p.employeeId !== employeeFilter) return false;
    return true;
  });

  return (
    <>
      <div className="space-y-8">
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">Payslips</h1>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-0 border border-border rounded-full p-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusTab(tab.key)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap sm:px-5 sm:text-sm",
                  statusTab === tab.key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="h-9 w-[160px] text-xs bg-secondary border-border rounded-full">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link href="/payslips/new">
              <Button size="sm" className="h-9 rounded-full">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> New Payslip
              </Button>
            </Link>
            <div className="flex items-center border border-border rounded-full p-1">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-full transition-colors",
                  viewMode === "list" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <List className="h-3.5 w-3.5" /> List
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-full transition-colors",
                  viewMode === "grid" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Grid
              </button>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-sm">No payslips found</p>
            <Link href="/payslips/new" className="text-primary text-sm mt-2 inline-block hover:underline">
              Create your first payslip
            </Link>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <Link
                key={p.id}
                href={`/payslips/${p.id}`}
                className="group block rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:bg-primary/20 transition-all min-h-[260px]"
              >
                <div className="flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between mb-8">
                    <span className="text-sm font-mono font-semibold">{p.slipNumber}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDownloadPdf(p);
                        }}
                        className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <Badge
                        className={cn(
                          "text-[11px] font-medium px-2.5 py-0.5 rounded-full border-0",
                          p.status === "paid" ? "bg-primary/20 text-primary" : "bg-blue-500/20 text-blue-400",
                        )}
                      >
                        {getPayslipStatusInfo(p.status).label}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <div className="space-y-1 mb-4">
                      <p className="text-lg font-medium text-primary group-hover:underline">{p.employee?.name || "No employee"}</p>
                      <p className="text-xs text-muted-foreground">{getMonthLabel(p.payPeriodMonth)} {p.payPeriodYear}</p>
                    </div>
                    <p className="text-xl font-semibold font-mono tracking-tighter">
                      {formatCurrency(Number(p.netPay), p.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getPaymentModeLabel(p.paymentMode)} · {new Date(p.paymentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    {p.status === "draft" && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setConfirmPaidId(p.id);
                        }}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Mark as Paid
                      </button>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="text-xs text-muted-foreground font-medium">Slip No</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs text-muted-foreground font-medium">Employee</TableHead>
                  <TableHead className="hidden md:table-cell text-xs text-muted-foreground font-medium">Period</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">Status</TableHead>
                  <TableHead className="hidden lg:table-cell text-xs text-muted-foreground font-medium">Payment Date</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">Net Pay</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const statusInfo = getPayslipStatusInfo(p.status);
                  return (
                    <TableRow key={p.id} className="group border-b border-border hover:bg-secondary/50">
                      <TableCell className="font-mono text-sm font-medium">{p.slipNumber}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{p.employee?.name || "-"}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{getMonthLabel(p.payPeriodMonth)} {p.payPeriodYear}</TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-[11px] font-medium px-2.5 py-0.5 rounded-full border-0",
                            p.status === "paid" ? "bg-primary/20 text-primary" : "bg-blue-500/20 text-blue-400",
                          )}
                        >
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {new Date(p.paymentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {formatCurrency(Number(p.netPay), p.currency)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem onClick={() => router.push(`/payslips/${p.id}`)}>
                              <Eye className="mr-2 h-3.5 w-3.5" /> View
                            </DropdownMenuItem>
                            {p.status === "draft" && (
                              <DropdownMenuItem onClick={() => router.push(`/payslips/${p.id}/edit`)}>
                                <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDownloadPdf(p)}>
                              <Download className="mr-2 h-3.5 w-3.5" /> Download PDF
                            </DropdownMenuItem>
                            {p.status === "draft" && (
                              <DropdownMenuItem onClick={() => setConfirmPaidId(p.id)}>
                                <CheckCircle className="mr-2 h-3.5 w-3.5" /> Mark as Paid
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDelete(p.id)} className="text-destructive" disabled={isPending}>
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmPaidId} onOpenChange={(open) => { if (!open) setConfirmPaidId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Paid</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this payslip as paid? This will update its status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmPaidId && handleMarkAsPaid(confirmPaidId)} disabled={isPending}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
