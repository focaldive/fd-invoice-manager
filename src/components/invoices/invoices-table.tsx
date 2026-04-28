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
  Copy,
  XCircle,
  CheckCircle,
  Pencil,
  LayoutGrid,
  List,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { generateInvoicePDF } from "@/lib/pdf";
import { cn } from "@/lib/utils";
import { formatCurrency, getCategoryLabel, getStatusInfo } from "@/lib/types";
import {
  setInvoiceStatus,
  duplicateInvoice,
  getInvoiceItemsForPdf,
} from "@/server/actions/invoices";
import type { listInvoices } from "@/server/queries/invoices";
import type { getSettings } from "@/server/queries/settings";

type StatusTab = "all" | "paid" | "unpaid" | "draft" | "cancelled";
type Invoices = Awaited<ReturnType<typeof listInvoices>>;
type Invoice = Invoices[number];
type Settings = Awaited<ReturnType<typeof getSettings>>;

const tabs: { key: StatusTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "unpaid", label: "Not Paid" },
  { key: "draft", label: "Draft" },
  { key: "cancelled", label: "Cancelled" },
];

export function InvoicesTable({ invoices, settings }: { invoices: Invoices; settings: Settings }) {
  const router = useRouter();
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [clientFilter, setClientFilter] = useState("all");
  const [confirmPaidId, setConfirmPaidId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleMarkAsPaid(id: string) {
    startTransition(async () => {
      try {
        await setInvoiceStatus(id, "paid");
        toast.success("Marked as paid");
        setConfirmPaidId(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  function handleCancel(id: string) {
    if (!confirm("Cancel this invoice?")) return;
    startTransition(async () => {
      try {
        await setInvoiceStatus(id, "cancelled");
        toast.success("Invoice cancelled");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  function handleDuplicate(invoice: Invoice) {
    startTransition(async () => {
      try {
        const newInvoice = await duplicateInvoice(invoice.id);
        toast.success("Invoice duplicated");
        router.push(`/invoices/${newInvoice.id}/edit`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to duplicate");
      }
    });
  }

  async function handleDownloadPdf(invoice: Invoice) {
    try {
      const items = await getInvoiceItemsForPdf(invoice.id);
      await generateInvoicePDF({ ...invoice, items, client: invoice.client ?? undefined }, settings);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate PDF");
    }
  }

  const clients = Array.from(
    new Map(
      invoices.filter((inv) => inv.client).map((inv) => [inv.client!.id, inv.client!.name]),
    ),
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const filtered = invoices.filter((inv) => {
    if (statusTab === "paid" && inv.status !== "paid") return false;
    if (statusTab === "unpaid" && !["sent", "overdue"].includes(inv.status)) return false;
    if (statusTab === "draft" && inv.status !== "draft") return false;
    if (statusTab === "cancelled" && inv.status !== "cancelled") return false;
    if (clientFilter !== "all" && inv.clientId !== clientFilter) return false;
    return true;
  });

  return (
    <>
      <div className="space-y-8">
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">Invoices</h1>

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
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="h-9 w-[160px] text-xs bg-secondary border-border rounded-full">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link href="/invoices/new">
              <Button size="sm" className="h-9 rounded-full">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> New Invoice
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
            <p className="text-muted-foreground text-sm">No invoices found</p>
            <Link href="/invoices/new" className="text-primary text-sm mt-2 inline-block hover:underline">
              Create your first invoice
            </Link>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="group block rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:bg-primary/20 transition-all min-h-[280px]"
              >
                <div className="flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between mb-8">
                    <span className="text-sm font-mono font-semibold flex items-center gap-1.5">
                      {inv.isAutoGenerated && <RotateCcw className="h-3 w-3 text-primary" />}
                      {inv.invoiceNumber}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDownloadPdf(inv);
                        }}
                        className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <Badge
                        className={cn(
                          "text-[11px] font-medium px-2.5 py-0.5 rounded-full border-0",
                          inv.status === "paid"
                            ? "bg-primary/20 text-primary"
                            : inv.status === "draft"
                              ? "bg-blue-500/20 text-blue-400"
                              : ["sent", "overdue"].includes(inv.status)
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-red-500/20 text-red-400",
                        )}
                      >
                        {inv.status === "paid"
                          ? "Paid"
                          : inv.status === "draft"
                            ? "Draft"
                            : ["sent", "overdue"].includes(inv.status)
                              ? "Not Paid"
                              : "Cancelled"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <div className="space-y-1 mb-4">
                      <p className="text-lg font-medium text-primary group-hover:underline">{inv.client?.name || "No client"}</p>
                      <p className="text-xs text-muted-foreground">{getCategoryLabel(inv.category)}</p>
                    </div>
                    <p className="text-xl font-semibold font-mono tracking-tighter">
                      {formatCurrency(Number(inv.total), inv.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {inv.status === "paid" ? "on" : "Due"}{" "}
                      {new Date(inv.status === "paid" ? inv.dateOfIssue : inv.dateDue).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    {["sent", "overdue"].includes(inv.status) && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setConfirmPaidId(inv.id);
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
                  <TableHead className="text-xs text-muted-foreground font-medium">Invoice ID</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs text-muted-foreground font-medium">Title</TableHead>
                  <TableHead className="hidden md:table-cell text-xs text-muted-foreground font-medium">Client</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">Status</TableHead>
                  <TableHead className="hidden lg:table-cell text-xs text-muted-foreground font-medium">Issue Date</TableHead>
                  <TableHead className="hidden md:table-cell text-xs text-muted-foreground font-medium">Due Date</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => {
                  const statusInfo = getStatusInfo(inv.status);
                  return (
                    <TableRow key={inv.id} className="group border-b border-border hover:bg-secondary/50">
                      <TableCell className="font-mono text-sm font-medium">
                        <span className="flex items-center gap-1.5">
                          {inv.isAutoGenerated && <RotateCcw className="h-3 w-3 text-primary" />}
                          {inv.invoiceNumber}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm font-medium">
                        {getCategoryLabel(inv.category)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{inv.client?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-[11px] font-medium px-2.5 py-0.5 rounded-full border-0",
                            inv.status === "paid"
                              ? "bg-primary/20 text-primary"
                              : inv.status === "draft"
                                ? "bg-blue-500/20 text-blue-400"
                                : ["sent", "overdue"].includes(inv.status)
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-red-500/20 text-red-400",
                          )}
                        >
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {new Date(inv.dateOfIssue).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {new Date(inv.dateDue).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {formatCurrency(Number(inv.total), inv.currency)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem onClick={() => router.push(`/invoices/${inv.id}`)}>
                              <Eye className="mr-2 h-3.5 w-3.5" /> View
                            </DropdownMenuItem>
                            {inv.status === "draft" && (
                              <DropdownMenuItem onClick={() => router.push(`/invoices/${inv.id}/edit`)}>
                                <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDownloadPdf(inv)}>
                              <Download className="mr-2 h-3.5 w-3.5" /> Download PDF
                            </DropdownMenuItem>
                            {["sent", "overdue"].includes(inv.status) && (
                              <DropdownMenuItem onClick={() => setConfirmPaidId(inv.id)}>
                                <CheckCircle className="mr-2 h-3.5 w-3.5" /> Mark as Paid
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDuplicate(inv)} disabled={isPending}>
                              <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
                            </DropdownMenuItem>
                            {inv.status !== "cancelled" && inv.status !== "paid" && (
                              <DropdownMenuItem onClick={() => handleCancel(inv.id)} className="text-destructive">
                                <XCircle className="mr-2 h-3.5 w-3.5" /> Cancel
                              </DropdownMenuItem>
                            )}
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
              Are you sure you want to mark this invoice as paid? This will update the invoice status.
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
