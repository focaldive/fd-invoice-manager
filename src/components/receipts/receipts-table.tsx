"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Eye, Receipt, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { generateInvoicePDF } from "@/lib/pdf";
import { ShareLinkMenu } from "@/components/invoices/share-link-menu";
import {
  PAYMENT_METHODS,
  formatCurrency,
  getPaidDate,
  getReceiptNumber,
} from "@/lib/types";
import { getInvoiceItemsForPdf } from "@/server/actions/invoices";
import type { listReceipts } from "@/server/queries/invoices";
import type { getSettings } from "@/server/queries/settings";

type Receipts = Awaited<ReturnType<typeof listReceipts>>;
type ReceiptRow = Receipts[number];
type Settings = Awaited<ReturnType<typeof getSettings>>;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function methodLabel(r: ReceiptRow) {
  const method = r.payments[0]?.paymentMethod;
  if (!method) return "—";
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method.replace("_", " ");
}

export function ReceiptsTable({ receipts, settings }: { receipts: Receipts; settings: Settings }) {
  const [query, setQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Newest payment first
  const rows = useMemo(
    () =>
      receipts
        .map((r) => ({ ...r, paidDate: getPaidDate(r), receiptNumber: getReceiptNumber(r.invoiceNumber) }))
        .sort((a, b) => b.paidDate.localeCompare(a.paidDate)),
    [receipts],
  );

  const clients = useMemo(
    () =>
      Array.from(new Map(rows.filter((r) => r.client).map((r) => [r.client!.id, r.client!.name]))).sort(
        (a, b) => a[1].localeCompare(b[1]),
      ),
    [rows],
  );

  const filtered = rows.filter((r) => {
    if (clientFilter !== "all" && r.clientId !== clientFilter) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      r.receiptNumber.toLowerCase().includes(q) ||
      r.invoiceNumber.toLowerCase().includes(q) ||
      (r.client?.name ?? "").toLowerCase().includes(q)
    );
  });

  // Totals collected, per currency (amounts in different currencies can't be summed)
  const collected = useMemo(() => {
    const byCurrency = new Map<string, number>();
    for (const r of filtered) byCurrency.set(r.currency, (byCurrency.get(r.currency) ?? 0) + Number(r.total));
    return Array.from(byCurrency).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const thisMonth = useMemo(() => {
    const key = new Date().toISOString().slice(0, 7);
    return rows.filter((r) => r.paidDate.slice(0, 7) === key).length;
  }, [rows]);

  async function handleDownload(r: ReceiptRow) {
    setDownloadingId(r.id);
    try {
      const items = await getInvoiceItemsForPdf(r.id);
      await generateInvoicePDF(
        { ...r, items, client: r.client ?? undefined },
        settings,
        "download",
        "receipt",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate receipt");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium tracking-tight">Receipts</h1>
        <p className="text-sm text-muted-foreground">
          Every paid invoice gets a receipt with a PAID stamp. Download one to send as proof of payment.
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Receipts issued" value={String(rows.length)} />
        <StatCard label="Paid this month" value={String(thisMonth)} />
        <StatCard
          label={clientFilter !== "all" || query ? "Collected (filtered)" : "Total collected"}
          value={collected.length ? formatCurrency(collected[0][1], collected[0][0]) : "—"}
          hint={
            collected.length > 1
              ? collected
                  .slice(1, 3)
                  .map(([c, v]) => formatCurrency(v, c))
                  .join(" · ") + (collected.length > 3 ? ` · +${collected.length - 3} more` : "")
              : undefined
          }
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search receipt, invoice or client"
            className="h-9 pl-8 text-sm"
          />
        </div>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="h-9 w-full text-xs bg-secondary border-border sm:w-[180px]">
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
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Receipt className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium">
            {rows.length === 0 ? "No receipts yet" : "No receipts match your filters"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length === 0
              ? "Mark an invoice as paid and its receipt will appear here."
              : "Try a different search or client."}
          </p>
          {rows.length === 0 && (
            <Link href="/invoices">
              <Button variant="outline" size="sm" className="mt-4">
                Go to invoices
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-muted-foreground">Receipt</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Client</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Paid on</TableHead>
                  <TableHead className="hidden text-xs font-medium text-muted-foreground md:table-cell">Method</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground">Amount</TableHead>
                  <TableHead className="w-[1%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="border-b border-border">
                    <TableCell>
                      <div className="font-mono text-sm">{r.receiptNumber}</div>
                      <Link
                        href={`/invoices/${r.id}`}
                        className="font-mono text-xs text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {r.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{r.client?.name ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatDate(r.paidDate)}</TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{methodLabel(r)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right font-mono text-sm font-semibold">
                      {formatCurrency(Number(r.total), r.currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/invoices/${r.id}`} aria-label={`View invoice ${r.invoiceNumber}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <ShareLinkMenu
                          invoiceId={r.id}
                          isPaid
                          isShared={!!r.shareToken}
                          size="icon"
                          receiptOnly
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => handleDownload(r)}
                          disabled={downloadingId === r.id}
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          {downloadingId === r.id ? "Preparing…" : "Receipt"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1.5 truncate font-mono text-xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
