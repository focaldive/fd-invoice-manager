"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Client, InvoiceItem, Settings, CATEGORIES, getClientAbbreviation, buildInvoiceNumber } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DatePicker } from "@/components/ui/date-picker"
import { Plus, Trash2, ArrowLeft, Send, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface Props {
  invoiceId?: string
}

export function InvoiceForm({ invoiceId }: Props) {
  const router = useRouter()
  const isEdit = !!invoiceId

  const [clients, setClients] = useState<Client[]>([])
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [clientId, setClientId] = useState("")
  const [dateOfIssue, setDateOfIssue] = useState(new Date().toISOString().split("T")[0])
  const [dateDue, setDateDue] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0])
  const [category, setCategory] = useState("other")
  const [currency, setCurrency] = useState<"LKR" | "USD">("LKR")
  const [taxPercentage, setTaxPercentage] = useState(0)
  const [discountPercentage, setDiscountPercentage] = useState(0)
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unit_price: 0, amount: 0, sort_order: 0 },
  ])
  const [saving, setSaving] = useState(false)
  const [newClientDialog, setNewClientDialog] = useState(false)
  const [newClient, setNewClient] = useState({ name: "", email: "", phone: "", address: "", country: "" })

  useEffect(() => {
    fetchClients()
    if (isEdit) {
      fetchInvoice()
    } else {
      fetchSettings()
    }
  }, [])

  async function fetchSettings() {
    const { data } = await supabase.from("settings").select("*").limit(1).single()
    if (data) {
      const s = data as Settings
      setCurrency(s.default_currency as "LKR" | "USD")
      setTaxPercentage(Number(s.default_tax_percentage))
      setNotes(s.default_notes || "")
      // Set due date based on payment terms
      const due = new Date()
      due.setDate(due.getDate() + (s.default_payment_terms || 14))
      setDateDue(due.toISOString().split("T")[0])
    }
  }

  // Regenerate invoice number when client or issue date changes (only for new invoices)
  useEffect(() => {
    if (!isEdit && clientId && clients.length > 0) {
      generateInvoiceNumber(clientId, dateOfIssue)
    }
  }, [clientId, dateOfIssue, clients])

  async function fetchClients() {
    const { data } = await supabase.from("clients").select("*").order("name")
    setClients(data || [])
  }

  async function generateInvoiceNumber(selectedClientId: string, issueDate: string) {
    const client = clients.find(c => c.id === selectedClientId)
    if (!client) return

    const abbr = getClientAbbreviation(client.name)
    const d = new Date(issueDate)
    const yy = String(d.getFullYear()).slice(2)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yearMonth = `${yy}${mm}`

    // Find the highest sequence number for this client abbreviation + month
    const prefix = `FD-${abbr}-${yearMonth}-`
    const { data } = await supabase
      .from("invoices")
      .select("invoice_number")
      .like("invoice_number", `${prefix}%`)
      .order("invoice_number", { ascending: false })
      .limit(1)

    let nextSeq = 1
    if (data && data.length > 0) {
      const parts = data[0].invoice_number.split("-")
      const lastSeq = parseInt(parts[parts.length - 1])
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1
    }

    setInvoiceNumber(buildInvoiceNumber(abbr, yearMonth, nextSeq))
  }

  async function fetchInvoice() {
    const { data: inv } = await supabase.from("invoices").select("*").eq("id", invoiceId).single()
    if (!inv) return
    setInvoiceNumber(inv.invoice_number)
    setClientId(inv.client_id || "")
    setDateOfIssue(inv.date_of_issue)
    setDateDue(inv.date_due)
    setCategory(inv.category)
    setCurrency(inv.currency)
    setTaxPercentage(Number(inv.tax_percentage))
    setDiscountPercentage(Number(inv.discount_percentage))
    setNotes(inv.notes || "")

    const { data: itemsData } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("sort_order")
    if (itemsData && itemsData.length > 0) {
      setItems(itemsData)
    }
  }

  function updateItem(index: number, field: keyof InvoiceItem, value: string | number) {
    const newItems = [...items]
    ;(newItems[index] as any)[field] = value
    if (field === "quantity" || field === "unit_price") {
      newItems[index].amount = Number(newItems[index].quantity) * Number(newItems[index].unit_price)
    }
    setItems(newItems)
  }

  function addItem() {
    setItems([...items, { description: "", quantity: 1, unit_price: 0, amount: 0, sort_order: items.length }])
  }

  function removeItem(index: number) {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((s, i) => s + Number(i.amount), 0)
  const taxAmount = subtotal * (taxPercentage / 100)
  const discountAmount = subtotal * (discountPercentage / 100)
  const total = subtotal + taxAmount - discountAmount

  async function handleSave(status: "draft" | "sent") {
    if (!clientId) { toast.error("Please select a client"); return }
    if (items.some((i) => !i.description.trim())) { toast.error("All items need a description"); return }

    setSaving(true)

    const invoiceData = {
      invoice_number: invoiceNumber,
      client_id: clientId,
      date_of_issue: dateOfIssue,
      date_due: dateDue,
      status,
      subtotal,
      tax_percentage: taxPercentage,
      tax_amount: taxAmount,
      discount_percentage: discountPercentage,
      discount_amount: discountAmount,
      total,
      currency,
      notes,
      category,
      updated_at: new Date().toISOString(),
    }

    let savedId = invoiceId

    if (isEdit) {
      const { error } = await supabase.from("invoices").update(invoiceData).eq("id", invoiceId)
      if (error) { toast.error("Failed to update invoice"); setSaving(false); return }
      await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId)
    } else {
      const { data, error } = await supabase.from("invoices").insert(invoiceData).select().single()
      if (error || !data) { toast.error("Failed to create invoice"); setSaving(false); return }
      savedId = data.id
    }

    await supabase.from("invoice_items").insert(
      items.map((item, idx) => ({
        invoice_id: savedId,
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        amount: Number(item.quantity) * Number(item.unit_price),
        sort_order: idx,
      }))
    )

    toast.success(isEdit ? "Invoice updated" : "Invoice created")
    router.push(`/invoices/${savedId}`)
    setSaving(false)
  }

  async function handleCreateClient() {
    if (!newClient.name.trim()) { toast.error("Client name required"); return }
    const { data, error } = await supabase.from("clients").insert(newClient).select().single()
    if (error || !data) { toast.error("Failed to create client"); return }
    toast.success("Client created")
    setNewClientDialog(false)
    setNewClient({ name: "", email: "", phone: "", address: "", country: "" })
    await fetchClients()
    setClientId(data.id)
  }

  const formatAmount = (amt: number) =>
    currency === "USD"
      ? `$${amt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `LKR ${amt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/invoices">
          <Button variant="ghost" size="icon" className="h-9 w-9"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isEdit ? "Edit Invoice" : "New Invoice"}</h1>
          {invoiceNumber && <p className="text-sm font-mono text-muted-foreground mt-0.5">{invoiceNumber}</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Invoice details */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold mb-2">Invoice Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Invoice Number</Label>
                  <Input value={invoiceNumber} readOnly placeholder={isEdit ? "" : "Select a client first"} className="mt-1.5 bg-secondary font-mono text-sm" />
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Date of Issue</Label>
                  <div className="mt-1.5">
                    <DatePicker
                      value={dateOfIssue ? new Date(dateOfIssue + "T00:00:00") : undefined}
                      onChange={(date) => date && setDateOfIssue(date.toISOString().split("T")[0])}
                      placeholder="Select issue date"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Due Date</Label>
                  <div className="mt-1.5">
                    <DatePicker
                      value={dateDue ? new Date(dateDue + "T00:00:00") : undefined}
                      onChange={(date) => date && setDateDue(date.toISOString().split("T")[0])}
                      placeholder="Select due date"
                    />
                  </div>
                </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Client</Label>
                <div className="flex gap-2 mt-1.5">
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => setNewClientDialog(true)} className="shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Currency</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as "LKR" | "USD")}>
                  <SelectTrigger className="mt-1.5 font-mono"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LKR">LKR - Sri Lankan Rupee</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Line Items</h3>
              <Button variant="outline" size="sm" onClick={addItem} className="h-8 text-xs rounded-full">
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
              </Button>
            </div>
            <div className="space-y-3">
              <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-[10px] font-mono font-medium uppercase tracking-wider text-muted-foreground px-1">
                <div className="col-span-5">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Unit Price</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-1"></div>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-12 items-start">
                  <div className="sm:col-span-5">
                    <Input placeholder="Description" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} className="text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} min={0} className="font-mono text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <Input type="number" placeholder="Price" value={item.unit_price} onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} min={0} className="font-mono text-sm" />
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-end h-9 px-3 text-sm font-mono font-semibold">
                    {formatAmount(Number(item.quantity) * Number(item.unit_price))}
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} disabled={items.length <= 1} className="h-9 w-9">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold mb-3">Notes / Terms</h3>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Additional notes or terms..." className="text-sm" />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 sticky top-24 space-y-4">
            <h3 className="text-sm font-semibold">Summary</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono font-medium">{formatAmount(subtotal)}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground w-16 shrink-0">Tax %</Label>
                <Input type="number" value={taxPercentage} onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)} className="h-8 font-mono text-sm" min={0} max={100} />
              </div>
              {taxPercentage > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Tax ({taxPercentage}%)</span>
                  <span className="font-mono">{formatAmount(taxAmount)}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground w-16 shrink-0">Disc %</Label>
                <Input type="number" value={discountPercentage} onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)} className="h-8 font-mono text-sm" min={0} max={100} />
              </div>
              {discountPercentage > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Discount ({discountPercentage}%)</span>
                  <span className="font-mono">-{formatAmount(discountAmount)}</span>
                </div>
              )}
            </div>
            <div className="border-t border-border pt-4">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold">Total</span>
                <span className="text-xl font-bold font-mono">{formatAmount(total)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button className="w-full h-10 rounded-full" onClick={() => handleSave("sent")} disabled={saving}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save & Send"}
            </Button>
            <Button variant="outline" className="w-full h-10 rounded-full" onClick={() => handleSave("draft")} disabled={saving}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save as Draft
            </Button>
          </div>
        </div>
      </div>

      {/* New client dialog */}
      <Dialog open={newClientDialog} onOpenChange={setNewClientDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-lg font-bold">Add New Client</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Name *</Label>
              <Input value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} placeholder="Client name" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} placeholder="Email" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Phone</Label>
              <Input value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} placeholder="Phone" className="mt-1.5 font-mono" />
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Address</Label>
              <Input value={newClient.address} onChange={(e) => setNewClient({ ...newClient, address: e.target.value })} placeholder="Address" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Country</Label>
              <Input value={newClient.country} onChange={(e) => setNewClient({ ...newClient, country: e.target.value })} placeholder="Country" className="mt-1.5" />
            </div>
            <Button onClick={handleCreateClient} className="w-full">Create Client</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
