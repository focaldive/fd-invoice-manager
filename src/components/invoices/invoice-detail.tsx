"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  XCircle,
  Send,
  RotateCcw,
  MessageCircle,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { generateInvoicePDF } from "@/lib/pdf";
import { cn } from "@/lib/utils";
import {
  PAYMENT_METHODS,
  formatCurrency,
  getCategoryLabel,
  getStatusInfo,
} from "@/lib/types";
import { setInvoiceStatus } from "@/server/actions/invoices";
import { recordPayment } from "@/server/actions/payments";
import type { getInvoiceFull } from "@/server/queries/invoices";
import type { listDeliveryLogs } from "@/server/queries/delivery-logs";

type FullInvoice = NonNullable<Awaited<ReturnType<typeof getInvoiceFull>>>;
type DeliveryLogs = Awaited<ReturnType<typeof listDeliveryLogs>>;
type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

const initialPaymentForm = {
  amount: "",
  paymentDate: new Date().toISOString().split("T")[0],
  paymentMethod: "bank_transfer" as PaymentMethod,
  reference: "",
  notes: "",
};

export function InvoiceDetail({
  invoice,
  deliveryLogs,
}: {
  invoice: FullInvoice;
  deliveryLogs: DeliveryLogs;
}) {
  const router = useRouter();
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [confirmPaid, setConfirmPaid] = useState(false);
  const [confirmWhatsApp, setConfirmWhatsApp] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [isPending, startTransition] = useTransition();

  const items = invoice.items;
  const payments = invoice.payments;
  const settings = invoice.settings;

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const amountDue = Number(invoice.total) - totalPaid;
  const fmt = (n: number) => formatCurrency(n, invoice.currency);
  const whatsAppSent = !!invoice.sentOnWhatsapp;

  function handleStatusChange(status: "draft" | "sent" | "paid" | "overdue" | "cancelled") {
    startTransition(async () => {
      try {
        await setInvoiceStatus(invoice.id, status);
        toast.success(`Status changed to ${status}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  function handleMarkAsPaid() {
    startTransition(async () => {
      try {
        await setInvoiceStatus(invoice.id, "paid");
        toast.success("Marked as paid");
        setConfirmPaid(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  function handleCancel() {
    if (!confirm("Cancel this invoice?")) return;
    startTransition(async () => {
      try {
        await setInvoiceStatus(invoice.id, "cancelled");
        toast.success("Invoice cancelled");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  function handleMarkAsSent() {
    startTransition(async () => {
      try {
        await setInvoiceStatus(invoice.id, "sent");
        toast.success("Marked as sent");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  async function handleDownloadPDF() {
    try {
      await generateInvoicePDF(
        { ...invoice, items, client: invoice.client ?? undefined },
        settings,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate PDF");
    }
  }

  async function handleSendWhatsApp() {
    setSendingWhatsApp(true);
    try {
      const res = await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send via WhatsApp");
        return;
      }
      toast.success("Invoice sent via WhatsApp!");
      router.refresh();
    } catch {
      toast.error("Failed to send via WhatsApp");
    } finally {
      setSendingWhatsApp(false);
    }
  }

  function handleRecordPayment() {
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    startTransition(async () => {
      try {
        await recordPayment({
          invoiceId: invoice.id,
          amount: Number(paymentForm.amount),
          paymentDate: paymentForm.paymentDate,
          paymentMethod: paymentForm.paymentMethod,
          reference: paymentForm.reference || null,
          notes: paymentForm.notes || null,
        });
        toast.success("Payment recorded");
        setPaymentDialog(false);
        setPaymentForm(initialPaymentForm);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to record payment");
      }
    });
  }

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/invoices">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-3xl font-semibold tracking-tight font-mono">
                  {invoice.invoiceNumber}
                </h1>
                <Badge
                  className={cn(
                    "text-[11px] font-medium px-2.5 py-0.5 rounded-full border-0",
                    invoice.status === "paid"
                      ? "bg-primary/20 text-primary"
                      : invoice.status === "draft"
                        ? "bg-blue-500/20 text-blue-400"
                        : ["sent", "overdue"].includes(invoice.status)
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-red-500/20 text-red-400",
                  )}
                >
                  {getStatusInfo(invoice.status).label}
                </Badge>
                {invoice.isAutoGenerated && (
                  <Badge className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border-0 bg-violet-500/20 text-violet-400">
                    <RotateCcw className="h-3 w-3 mr-1" /> Recurring
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {getCategoryLabel(invoice.category)}
                {invoice.recurringInvoiceId && (
                  <>
                    {" · "}
                    <Link href="/recurring" className="text-primary hover:underline">
                      Auto-generated from recurring template
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="h-9 rounded-full">
              <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
            </Button>
            {invoice.status === "draft" && (
              <>
                <Link href={`/invoices/${invoice.id}/edit`}>
                  <Button variant="outline" size="sm" className="h-9 rounded-full">
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                </Link>
                <Button size="sm" onClick={handleMarkAsSent} disabled={isPending} className="h-9 rounded-full">
                  <Send className="mr-1.5 h-3.5 w-3.5" /> Mark as Sent
                </Button>
              </>
            )}
            {["sent", "overdue"].includes(invoice.status) && (
              <Button size="sm" onClick={() => setConfirmPaid(true)} className="h-9 rounded-full">
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Mark as Paid
              </Button>
            )}
            {["paid", "cancelled"].includes(invoice.status) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 rounded-full">
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Change Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px]">
                  {invoice.status !== "draft" && (
                    <DropdownMenuItem onClick={() => handleStatusChange("draft")}>
                      <Pencil className="mr-2 h-3.5 w-3.5" /> Draft
                    </DropdownMenuItem>
                  )}
                  {invoice.status !== "sent" && (
                    <DropdownMenuItem onClick={() => handleStatusChange("sent")}>
                      <Send className="mr-2 h-3.5 w-3.5" /> Sent
                    </DropdownMenuItem>
                  )}
                  {invoice.status === "cancelled" && (
                    <DropdownMenuItem onClick={() => handleStatusChange("paid")}>
                      <CheckCircle className="mr-2 h-3.5 w-3.5" /> Paid
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {invoice.status !== "cancelled" && invoice.status !== "paid" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isPending}
                className="h-9 rounded-full text-destructive hover:text-destructive"
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" /> Cancel
              </Button>
            )}
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
                  {settings?.companyPhone && <p className="text-sm text-muted-foreground">{settings.companyPhone}</p>}
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Bill to</p>
                  <p className="text-sm font-semibold">{invoice.client?.name || "N/A"}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{invoice.client?.address}</p>
                  <p className="text-sm text-muted-foreground">{invoice.client?.country}</p>
                  {invoice.client?.email && <p className="text-sm text-muted-foreground">{invoice.client.email}</p>}
                  {invoice.client?.phone && <p className="text-sm text-muted-foreground">{invoice.client.phone}</p>}
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3 border-t border-border pt-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Date of Issue</span>
                  <p className="text-sm font-medium mt-0.5">{new Date(invoice.dateOfIssue).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Due Date</span>
                  <p className="text-sm font-medium mt-0.5">{new Date(invoice.dateDue).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Currency</span>
                  <p className="text-sm font-mono font-medium mt-0.5">{invoice.currency}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-sm font-semibold">Line Items</h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="text-xs text-muted-foreground font-medium">Description</TableHead>
                      <TableHead className="text-center text-xs text-muted-foreground font-medium">Qty</TableHead>
                      <TableHead className="text-right text-xs text-muted-foreground font-medium">Unit Price</TableHead>
                      <TableHead className="text-right text-xs text-muted-foreground font-medium">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="border-b border-border">
                        <TableCell className="text-sm">{item.description}</TableCell>
                        <TableCell className="text-center text-sm font-mono">{item.quantity}</TableCell>
                        <TableCell className="text-right text-sm font-mono">{fmt(Number(item.unitPrice))}</TableCell>
                        <TableCell className="text-right text-sm font-mono font-semibold">{fmt(Number(item.amount))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {payments.length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h3 className="text-sm font-semibold">Payment History</h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border">
                        <TableHead className="text-xs text-muted-foreground font-medium">Date</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium">Method</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium">Reference</TableHead>
                        <TableHead className="text-right text-xs text-muted-foreground font-medium">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id} className="border-b border-border">
                          <TableCell className="text-sm font-mono">{new Date(p.paymentDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-sm capitalize">{p.paymentMethod.replace("_", " ")}</TableCell>
                          <TableCell className="text-sm font-mono text-muted-foreground">{p.reference || "-"}</TableCell>
                          <TableCell className="text-right text-sm font-mono font-semibold text-primary">{fmt(Number(p.amount))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {invoice.notes && (
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-sm font-semibold mb-3">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{invoice.notes}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 sticky top-24 space-y-3">
              <h3 className="text-sm font-semibold mb-4">Summary</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{fmt(Number(invoice.subtotal))}</span>
              </div>
              {Number(invoice.taxPercentage) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({invoice.taxPercentage}%)</span>
                  <span className="font-mono">{fmt(Number(invoice.taxAmount))}</span>
                </div>
              )}
              {Number(invoice.discountAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Discount{Number(invoice.discountPercentage) > 0 ? ` (${invoice.discountPercentage}%)` : ""}
                  </span>
                  <span className="font-mono">-{fmt(Number(invoice.discountAmount))}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between font-semibold">
                <span>Total</span>
                <span className="font-mono text-lg">{fmt(Number(invoice.total))}</span>
              </div>
              {payments.length > 0 && (
                <>
                  <div className="flex justify-between text-sm text-primary">
                    <span>Paid</span>
                    <span className="font-mono">{fmt(totalPaid)}</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between font-semibold">
                    <span>Amount Due</span>
                    <span className="font-mono text-lg">{fmt(amountDue > 0 ? amountDue : 0)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-6 space-y-3">
              <h3 className="text-sm font-semibold mb-4">Send Invoice</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!invoice.client?.phone) {
                    toast.error("Client does not have a phone number");
                    return;
                  }
                  setConfirmWhatsApp(true);
                }}
                disabled={sendingWhatsApp || !invoice.client?.phone}
                className={cn(
                  "w-full h-9 rounded-full justify-center",
                  whatsAppSent && "border-primary/40 text-primary hover:text-primary",
                )}
              >
                {sendingWhatsApp ? (
                  <>
                    <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> Sending...
                  </>
                ) : whatsAppSent ? (
                  <>
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> WhatsApp Sent
                  </>
                ) : (
                  <>
                    <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
                  </>
                )}
              </Button>
            </div>

            {deliveryLogs.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-sm font-semibold mb-4">Delivery</h3>
                <div className="space-y-3">
                  {deliveryLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full shrink-0",
                          log.status === "sent"
                            ? "bg-primary/10"
                            : log.status === "failed"
                              ? "bg-red-500/10"
                              : "bg-muted",
                        )}
                      >
                        {log.channel === "whatsapp" ? (
                          <MessageCircle className={cn("h-3.5 w-3.5", log.status === "failed" ? "text-red-400" : "text-[#25D366]")} />
                        ) : (
                          <Mail className={cn("h-3.5 w-3.5", log.status === "failed" ? "text-red-400" : "text-blue-400")} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium capitalize">{log.channel}</span>
                          {log.status === "sent" && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
                          {log.status === "failed" && <XCircle className="h-3.5 w-3.5 text-red-400" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{log.recipient}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={confirmPaid} onOpenChange={setConfirmPaid}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Paid</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this invoice as paid? This will update the invoice status.
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

      <AlertDialog open={confirmWhatsApp} onOpenChange={setConfirmWhatsApp}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{whatsAppSent ? "Resend via WhatsApp" : "Send via WhatsApp"}</AlertDialogTitle>
            <AlertDialogDescription>
              {whatsAppSent
                ? `This invoice was already sent via WhatsApp. Do you want to resend ${invoice.invoiceNumber} to ${invoice.client?.phone}?`
                : `This will send invoice ${invoice.invoiceNumber} to ${invoice.client?.phone} via WhatsApp.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmWhatsApp(false);
                handleSendWhatsApp();
              }}
            >
              {whatsAppSent ? "Resend" : "Send"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount *</Label>
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder={`Max: ${fmt(amountDue > 0 ? amountDue : Number(invoice.total))}`}
                min={0}
                className="mt-1.5 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Payment Date</Label>
              <div className="mt-1.5">
                <DatePicker
                  value={paymentForm.paymentDate ? new Date(paymentForm.paymentDate + "T00:00:00") : undefined}
                  onChange={(date) =>
                    date && setPaymentForm({ ...paymentForm, paymentDate: date.toISOString().split("T")[0] })
                  }
                  placeholder="Select payment date"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Payment Method</Label>
              <Select
                value={paymentForm.paymentMethod}
                onValueChange={(v) => setPaymentForm({ ...paymentForm, paymentMethod: v as PaymentMethod })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Reference</Label>
              <Input
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                placeholder="Transaction reference"
                className="mt-1.5 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</Label>
              <Input
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Optional notes"
                className="mt-1.5"
              />
            </div>
            <Button onClick={handleRecordPayment} disabled={isPending} className="w-full">
              {isPending ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
