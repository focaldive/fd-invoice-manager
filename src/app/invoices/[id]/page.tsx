"use client"

import { AppShell } from "@/components/app-shell"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Invoice, InvoiceItem, Payment, Settings, PAYMENT_METHODS, formatCurrency, getCategoryLabel, getStatusInfo } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Download, Pencil, CheckCircle, XCircle, CreditCard, Send } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { generateInvoicePDF } from "@/lib/pdf"
import { cn } from "@/lib/utils"

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [paymentDialog, setPaymentDialog] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "bank_transfer",
    reference: "",
    notes: "",
  })

  useEffect(() => {
    fetchData()
  }, [params.id])

  async function fetchData() {
    const [{ data: inv }, { data: itms }, { data: pays }, { data: stgs }] = await Promise.all([
      supabase.from("invoices").select("*, client:clients(*)").eq("id", params.id).single(),
      supabase.from("invoice_items").select("*").eq("invoice_id", params.id).order("sort_order"),
      supabase.from("payments").select("*").eq("invoice_id", params.id).order("payment_date", { ascending: false }),
      supabase.from("settings").select("*").limit(1).single(),
    ])
    setInvoice(inv as Invoice)
    setItems(itms || [])
    setPayments(pays || [])
    if (stgs) setSettings(stgs as Settings)
    setLoading(false)
  }

  async function markAsPaid() {
    await supabase.from("invoices").update({ status: "paid", updated_at: new Date().toISOString() }).eq("id", params.id)
    toast.success("Marked as paid")
    fetchData()
  }

  async function cancelInvoice() {
    if (!confirm("Cancel this invoice?")) return
    await supabase.from("invoices").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", params.id)
    toast.success("Invoice cancelled")
    fetchData()
  }

  async function markAsSent() {
    await supabase.from("invoices").update({ status: "sent", updated_at: new Date().toISOString() }).eq("id", params.id)
    toast.success("Marked as sent")
    fetchData()
  }

  async function handleDownloadPDF() {
    if (!invoice) return
    await generateInvoicePDF({ ...invoice, items }, settings)
  }

  async function recordPayment() {
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      toast.error("Enter a valid amount")
      return
    }

    const { error } = await supabase.from("payments").insert({
      invoice_id: params.id as string,
      amount: Number(paymentForm.amount),
      payment_date: paymentForm.payment_date,
      payment_method: paymentForm.payment_method,
      reference: paymentForm.reference || null,
      notes: paymentForm.notes || null,
    })

    if (error) { toast.error("Failed to record payment"); return }

    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0) + Number(paymentForm.amount)
    if (invoice && totalPaid >= Number(invoice.total)) {
      await supabase.from("invoices").update({ status: "paid", updated_at: new Date().toISOString() }).eq("id", params.id)
    }

    toast.success("Payment recorded")
    setPaymentDialog(false)
    setPaymentForm({ amount: "", payment_date: new Date().toISOString().split("T")[0], payment_method: "bank_transfer", reference: "", notes: "" })
    fetchData()
  }

  if (loading) return <AppShell><div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading...</div></AppShell>
  if (!invoice) return <AppShell><div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Invoice not found</div></AppShell>

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0)
  const amountDue = Number(invoice.total) - totalPaid
  const fmt = (n: number) => formatCurrency(n, invoice.currency)

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/invoices">
              <Button variant="ghost" size="icon" className="h-9 w-9"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight font-mono">{invoice.invoice_number}</h1>
                <Badge
                  className={cn(
                    "text-[11px] font-medium px-2.5 py-0.5 rounded-full border-0",
                    invoice.status === "paid" ? "bg-primary/20 text-primary" :
                    invoice.status === "draft" ? "bg-blue-500/20 text-blue-400" :
                    ["sent", "overdue"].includes(invoice.status) ? "bg-amber-500/20 text-amber-400" :
                    "bg-red-500/20 text-red-400"
                  )}
                >
                  {getStatusInfo(invoice.status).label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{getCategoryLabel(invoice.category)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="h-9 rounded-full">
              <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
            </Button>
            {invoice.status === "draft" && (
              <>
                <Link href={`/invoices/${invoice.id}/edit`}>
                  <Button variant="outline" size="sm" className="h-9 rounded-full"><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                </Link>
                <Button size="sm" onClick={markAsSent} className="h-9 rounded-full">
                  <Send className="mr-1.5 h-3.5 w-3.5" /> Mark as Sent
                </Button>
              </>
            )}
            {["sent", "overdue"].includes(invoice.status) && (
              <>
                <Button variant="outline" size="sm" onClick={() => setPaymentDialog(true)} className="h-9 rounded-full">
                  <CreditCard className="mr-1.5 h-3.5 w-3.5" /> Record Payment
                </Button>
                <Button size="sm" onClick={markAsPaid} className="h-9 rounded-full">
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Mark as Paid
                </Button>
              </>
            )}
            {invoice.status !== "cancelled" && invoice.status !== "paid" && (
              <Button variant="outline" size="sm" onClick={cancelInvoice} className="h-9 rounded-full text-destructive hover:text-destructive">
                <XCircle className="mr-1.5 h-3.5 w-3.5" /> Cancel
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Invoice Info */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">From</p>
                  <p className="text-sm font-semibold">FocalDive (Pvt) Ltd</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Kurunegala, Sri Lanka</p>
                  <p className="text-sm text-muted-foreground">devfocaldive@gmail.com</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Bill to</p>
                  <p className="text-sm font-semibold">{(invoice as any).client?.name || "N/A"}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{(invoice as any).client?.address}</p>
                  <p className="text-sm text-muted-foreground">{(invoice as any).client?.country}</p>
                  <p className="text-sm text-muted-foreground">{(invoice as any).client?.email}</p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3 border-t border-border pt-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Date of Issue</span>
                  <p className="text-sm font-medium mt-0.5">{new Date(invoice.date_of_issue).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Due Date</span>
                  <p className="text-sm font-medium mt-0.5">{new Date(invoice.date_due).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Currency</span>
                  <p className="text-sm font-mono font-medium mt-0.5">{invoice.currency}</p>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-sm font-semibold">Line Items</h3>
              </div>
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
                      <TableCell className="text-right text-sm font-mono">{fmt(Number(item.unit_price))}</TableCell>
                      <TableCell className="text-right text-sm font-mono font-semibold">{fmt(Number(item.amount))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Payments */}
            {payments.length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h3 className="text-sm font-semibold">Payment History</h3>
                </div>
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
                        <TableCell className="text-sm font-mono">{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm capitalize">{p.payment_method.replace("_", " ")}</TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">{p.reference || "-"}</TableCell>
                        <TableCell className="text-right text-sm font-mono font-semibold text-primary">{fmt(Number(p.amount))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-sm font-semibold mb-3">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Right summary */}
          <div>
            <div className="rounded-xl border border-border bg-card p-6 sticky top-24 space-y-3">
              <h3 className="text-sm font-semibold mb-4">Summary</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{fmt(Number(invoice.subtotal))}</span>
              </div>
              {Number(invoice.tax_percentage) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({invoice.tax_percentage}%)</span>
                  <span className="font-mono">{fmt(Number(invoice.tax_amount))}</span>
                </div>
              )}
              {Number(invoice.discount_percentage) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount ({invoice.discount_percentage}%)</span>
                  <span className="font-mono">-{fmt(Number(invoice.discount_amount))}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between font-bold">
                <span>Total</span>
                <span className="font-mono text-lg">{fmt(Number(invoice.total))}</span>
              </div>
              {payments.length > 0 && (
                <>
                  <div className="flex justify-between text-sm text-primary">
                    <span>Paid</span>
                    <span className="font-mono">{fmt(totalPaid)}</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between font-bold">
                    <span>Amount Due</span>
                    <span className="font-mono text-lg">{fmt(amountDue > 0 ? amountDue : 0)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-lg font-bold">Record Payment</DialogTitle></DialogHeader>
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
                    value={paymentForm.payment_date ? new Date(paymentForm.payment_date + "T00:00:00") : undefined}
                    onChange={(date) => date && setPaymentForm({ ...paymentForm, payment_date: date.toISOString().split("T")[0] })}
                    placeholder="Select payment date"
                  />
                </div>
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Payment Method</Label>
              <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
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
            <Button onClick={recordPayment} className="w-full">Record Payment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
