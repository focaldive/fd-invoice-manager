"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useNavigationGuard } from "@/lib/navigation-guard"
import { Client, InvoiceItem, Settings, CATEGORIES, CURRENCIES, getClientAbbreviation, buildInvoiceNumber, computeNextGenerationDate } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DatePicker } from "@/components/ui/date-picker"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, ArrowLeft, Send, Save, AlertTriangle, MessageCircle, /* Mail, */ Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { cn } from "@/lib/utils"

function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  system_maintenance: [
    "Monthly system maintenance",
    "Bug fixes & patches",
    "Performance optimization",
    "Security updates & monitoring",
    "Database maintenance",
    "Server maintenance & updates",
    "Backup & recovery service",
  ],
  project_quotation: [
    "UI/UX design",
    "Frontend development",
    "Backend development",
    "Full-stack development",
    "Project planning & consultation",
    "Wireframing & prototyping",
    "API integration",
    "Quality assurance & testing",
  ],
  milestone_payment: [
    "Project milestone - Phase 1",
    "Project milestone - Phase 2",
    "Project milestone - Phase 3",
    "Design milestone completion",
    "Development milestone completion",
    "Final delivery & handover",
  ],
  hosting: [
    "Web hosting - Monthly",
    "Web hosting - Annual",
    "Cloud server hosting",
    "SSL certificate renewal",
    "CDN service",
    "Email hosting",
    "Domain & hosting bundle",
  ],
  domain: [
    "Domain registration",
    "Domain renewal",
    "Domain transfer",
    "DNS management",
    "Domain privacy protection",
  ],
  graphic_design: [
    "Social media post design",
    "Post editing & retouching",
    "Brochure design",
    "Flyer design",
    "Branding & logo design",
    "Brand identity package",
    "Business card design",
    "Banner & poster design",
    "Packaging design",
    "Catalogue design",
  ],
  other: [
    "Custom development work",
    "Training & documentation",
    "Data migration",
    "Third-party integration",
    "Emergency support",
  ],
}

interface Props {
  invoiceId?: string
}

export function InvoiceForm({ invoiceId }: Props) {
  const router = useRouter()
  const { registerGuard, unregisterGuard } = useNavigationGuard()
  const isEdit = !!invoiceId

  const [clients, setClients] = useState<Client[]>([])
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [clientId, setClientId] = useState("")
  const [dateOfIssue, setDateOfIssue] = useState(toLocalDateString(new Date()))
  const [dateDue, setDateDue] = useState(toLocalDateString(new Date(Date.now() + 4 * 86400000)))
  const [category, setCategory] = useState("other")
  const [currency, setCurrency] = useState("LKR")
  const [taxPercentage, setTaxPercentage] = useState(0)
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage")
  const [discountPercentage, setDiscountPercentage] = useState(0)
  const [discountFixedAmount, setDiscountFixedAmount] = useState(0)
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unit_price: 0, amount: 0, sort_order: 0 },
  ])
  const [saving, setSaving] = useState(false)
  const [newClientDialog, setNewClientDialog] = useState(false)
  const [newClient, setNewClient] = useState({ name: "", email: "", phone: "", address: "", country: "" })
  const [unsavedDialog, setUnsavedDialog] = useState(false)
  const [deliveryDialog, setDeliveryDialog] = useState(false)
  // const [sendViaEmail, setSendViaEmail] = useState(false)
  const [sendViaWhatsApp, setSendViaWhatsApp] = useState(false)
  const [delivering, setDelivering] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringDayOfMonth, setRecurringDayOfMonth] = useState(1)
  const [autoSendWhatsApp, setAutoSendWhatsApp] = useState(false)
  const pendingNavRef = useRef<string | null>(null)
  const savedRef = useRef(false)

  const isDirty = useCallback(() => {
    if (savedRef.current) return false
    if (clientId) return true
    if (items.some((i) => i.description.trim() || i.unit_price > 0)) return true
    return false
  }, [clientId, items])

  // Register navigation guard for AppShell header links
  useEffect(() => {
    registerGuard((href: string) => {
      if (isDirty()) {
        pendingNavRef.current = href
        setUnsavedDialog(true)
        return true // blocked
      }
      return false // allow
    })
    return () => unregisterGuard()
  }, [isDirty, registerGuard, unregisterGuard])

  // Browser tab close / refresh warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty()) {
        e.preventDefault()
      }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])

  // Browser back/forward button interception
  useEffect(() => {
    // Push a dummy state so we can detect back button
    window.history.pushState({ invoiceForm: true }, "")

    const handlePopState = () => {
      if (isDirty()) {
        // Re-push state to prevent actual navigation
        window.history.pushState({ invoiceForm: true }, "")
        pendingNavRef.current = "/invoices"
        setUnsavedDialog(true)
      }
      // If not dirty, allow default browser behavior
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [isDirty])

  function handleNavigation(href: string) {
    if (isDirty()) {
      pendingNavRef.current = href
      setUnsavedDialog(true)
    } else {
      router.push(href)
    }
  }

  function handleDiscardAndLeave() {
    setUnsavedDialog(false)
    savedRef.current = true
    const dest = pendingNavRef.current || "/invoices"
    pendingNavRef.current = null
    router.push(dest)
  }

  async function handleSaveAsDraftAndLeave() {
    if (!clientId) {
      toast.error("Please select a client before saving as draft")
      return
    }
    setUnsavedDialog(false)
    savedRef.current = true
    await handleSave("draft")
  }

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
      setCurrency(s.default_currency)
      setTaxPercentage(Number(s.default_tax_percentage))
      setNotes(s.default_notes || "")
      // Set due date based on payment terms
      const due = new Date()
      due.setDate(due.getDate() + (s.default_payment_terms || 4))
      setDateDue(toLocalDateString(due))
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
    if (Number(inv.discount_percentage) > 0) {
      setDiscountType("percentage")
      setDiscountPercentage(Number(inv.discount_percentage))
    } else if (Number(inv.discount_amount) > 0) {
      setDiscountType("fixed")
      setDiscountFixedAmount(Number(inv.discount_amount))
    }
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
      ; (newItems[index] as any)[field] = value
    if (field === "quantity" || field === "unit_price") {
      newItems[index].amount = Number(newItems[index].quantity) * Number(newItems[index].unit_price)
    }
    setItems(newItems)
  }

  function addItem() {
    setItems([...items, { description: "", quantity: 1, unit_price: 0, amount: 0, sort_order: items.length }])
  }

  function applySuggestion(description: string) {
    const emptyIdx = items.findIndex((i) => !i.description.trim())
    if (emptyIdx !== -1) {
      updateItem(emptyIdx, "description", description)
    } else {
      setItems([...items, { description, quantity: 1, unit_price: 0, amount: 0, sort_order: items.length }])
    }
  }

  function removeItem(index: number) {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((s, i) => s + Number(i.amount), 0)
  const taxAmount = subtotal * (taxPercentage / 100)
  const discountAmount = discountType === "percentage"
    ? subtotal * (discountPercentage / 100)
    : discountFixedAmount
  const total = subtotal + taxAmount - discountAmount

  const selectedClient = clients.find(c => c.id === clientId)

  function validateForm(): boolean {
    if (!clientId) { toast.error("Please select a client"); return false }
    if (!invoiceNumber) { toast.error("Invoice number not generated yet. Please wait a moment."); return false }
    if (items.some((i) => !i.description.trim())) { toast.error("All items need a description"); return false }
    return true
  }

  async function saveInvoice(status: "draft" | "sent"): Promise<string | null> {
    const invoiceData = {
      invoice_number: invoiceNumber,
      client_id: clientId,
      date_of_issue: dateOfIssue,
      date_due: dateDue,
      status,
      subtotal,
      tax_percentage: taxPercentage,
      tax_amount: taxAmount,
      discount_percentage: discountType === "percentage" ? discountPercentage : 0,
      discount_amount: discountAmount,
      total,
      currency,
      notes: notes || null,
      category,
    }

    let savedId = invoiceId

    if (isEdit) {
      const { error } = await supabase.from("invoices").update(invoiceData).eq("id", invoiceId)
      if (error) {
        console.error("Invoice update error:", error)
        toast.error(`Failed to update invoice: ${error.message}`)
        return null
      }
      await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId)
    } else {
      const { data, error } = await supabase.from("invoices").insert(invoiceData).select().single()
      if (error || !data) {
        console.error("Invoice create error:", error)
        toast.error(`Failed to create invoice: ${error?.message || "Unknown error"}`)
        return null
      }
      savedId = data.id
    }

    const { error: itemsError } = await supabase.from("invoice_items").insert(
      items.map((item, idx) => ({
        invoice_id: savedId,
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        amount: Number(item.quantity) * Number(item.unit_price),
        sort_order: idx,
      }))
    )
    if (itemsError) {
      console.error("Invoice items insert error:", itemsError)
    }

    return savedId || null
  }

  async function saveRecurringTemplate(savedId: string) {
    const { data: rec, error: recError } = await supabase.from("recurring_invoices").insert({
      client_id: clientId,
      currency,
      tax_percentage: taxPercentage,
      discount_percentage: discountType === "percentage" ? discountPercentage : 0,
      discount_amount: discountType === "fixed" ? discountFixedAmount : 0,
      notes: notes || null,
      category,
      day_of_month: recurringDayOfMonth,
      is_active: true,
      auto_send_whatsapp: autoSendWhatsApp,
      generated_count: 1,
      next_generation_date: computeNextGenerationDate(recurringDayOfMonth),
    }).select().single()

    if (recError || !rec) {
      console.error("Recurring template error:", recError)
      toast.error("Invoice saved but failed to create recurring template")
      return
    }

    // Save recurring items
    await supabase.from("recurring_invoice_items").insert(
      items.map((item, idx) => ({
        recurring_invoice_id: rec.id,
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        amount: Number(item.quantity) * Number(item.unit_price),
        sort_order: idx,
      }))
    )

    // Link the invoice to the recurring template
    await supabase.from("invoices").update({
      recurring_invoice_id: rec.id,
      is_auto_generated: false,
    }).eq("id", savedId)

    toast.success("Recurring template created")
  }

  async function handleSave(status: "draft" | "sent") {
    if (!validateForm()) return
    setSaving(true)
    const savedId = await saveInvoice(status)
    if (savedId) {
      if (isRecurring && !isEdit) {
        await saveRecurringTemplate(savedId)
      }
      toast.success(isEdit ? "Invoice updated" : "Invoice created")
      savedRef.current = true
      router.push(`/invoices/${savedId}`)
    }
    setSaving(false)
  }

  function handleOpenDeliveryDialog() {
    if (!validateForm()) return
    // setSendViaEmail(!!selectedClient?.email)
    setSendViaWhatsApp(!!selectedClient?.phone)
    setDeliveryDialog(true)
  }

  async function handleCreateAndSend(sendChannels: boolean) {
    setDelivering(true)
    const status = sendChannels ? "sent" : "draft"
    const savedId = await saveInvoice(status)

    if (!savedId) {
      setDelivering(false)
      return
    }

    if (isRecurring && !isEdit) {
      await saveRecurringTemplate(savedId)
    }

    if (sendChannels) {
      const results: string[] = []

      if (sendViaWhatsApp) {
        try {
          const res = await fetch("/api/send-whatsapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invoiceId: savedId }),
          })
          if (res.ok) results.push("WhatsApp")
          else {
            const data = await res.json()
            toast.error(data.error || "Failed to send via WhatsApp")
          }
        } catch {
          toast.error("Failed to send via WhatsApp")
        }
      }

      // if (sendViaEmail) {
      //   try {
      //     const res = await fetch("/api/send-email", {
      //       method: "POST",
      //       headers: { "Content-Type": "application/json" },
      //       body: JSON.stringify({ invoiceId: savedId }),
      //     })
      //     if (res.ok) results.push("Email")
      //     else {
      //       const data = await res.json()
      //       toast.error(data.error || "Failed to send via Email")
      //     }
      //   } catch {
      //     toast.error("Failed to send via Email")
      //   }
      // }

      if (results.length > 0) {
        toast.success(`Invoice sent via ${results.join(" & ")}`)
      }
    } else {
      toast.success(isEdit ? "Invoice updated" : "Invoice saved as draft")
    }

    savedRef.current = true
    setDeliveryDialog(false)
    setDelivering(false)
    router.push(`/invoices/${savedId}`)
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

  const formatAmount = (amt: number) => {
    const formatted = amt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const curr = CURRENCIES.find(c => c.value === currency)
    if (!curr) return `${currency} ${formatted}`
    const sym = curr.symbol
    if (['$', '£', '€', '₹'].includes(sym) || sym.endsWith('$')) return `${sym}${formatted}`
    return `${sym} ${formatted}`
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleNavigation("/invoices")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{isEdit ? "Edit Invoice" : "New Invoice"}</h1>
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
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="mt-1.5 font-mono"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
                    onChange={(date) => date && setDateOfIssue(toLocalDateString(date))}
                    placeholder="Select issue date"
                    fromDate={new Date()}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Due Date</Label>
                <div className="mt-1.5">
                  <DatePicker
                    value={dateDue ? new Date(dateDue + "T00:00:00") : undefined}
                    onChange={(date) => date && setDateDue(toLocalDateString(date))}
                    placeholder="Select due date"
                    fromDate={dateOfIssue ? new Date(dateOfIssue + "T00:00:00") : new Date()}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Line Items */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Line Items</h3>
              <Button variant="outline" size="sm" onClick={addItem} className="h-8 text-xs rounded-full cursor-pointer">
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
              </Button>
            </div>
            {CATEGORY_SUGGESTIONS[category] && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground self-center mr-1">Suggestions</span>
                {CATEGORY_SUGGESTIONS[category].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => applySuggestion(suggestion)}
                    className="px-2.5 py-1 text-xs rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/10 transition-colors cursor-pointer"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <div className="space-y-3">
              <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-[10px] font-mono font-medium uppercase tracking-wider text-muted-foreground px-1">
                <div className="col-span-5">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Unit Price</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-1"></div>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-12 items-start rounded-lg border border-border p-3 sm:border-0 sm:p-0">
                  <div className="sm:col-span-5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground sm:hidden">Description</label>
                    <Input placeholder="Description" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} className="text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:contents">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground sm:hidden">Qty</label>
                      <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} min={0} className="font-mono text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground sm:hidden">Unit Price</label>
                      <Input type="number" placeholder="Price" value={item.unit_price} onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} min={0} className="font-mono text-sm" />
                    </div>
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between sm:justify-end h-9 px-3 text-sm font-mono font-semibold">
                    <span className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground sm:hidden">Amount</span>
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
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground w-16 shrink-0">Disc</Label>
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    type="number"
                    value={discountType === "percentage" ? discountPercentage : discountFixedAmount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      if (discountType === "percentage") setDiscountPercentage(val)
                      else setDiscountFixedAmount(val)
                    }}
                    className="h-8 font-mono text-sm"
                    min={0}
                    max={discountType === "percentage" ? 100 : undefined}
                  />
                  <div className="flex items-center border border-border rounded-md overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => { setDiscountType("percentage"); setDiscountFixedAmount(0) }}
                      className={cn(
                        "px-3 h-8 text-xs font-medium transition-colors cursor-pointer",
                        discountType === "percentage"
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDiscountType("fixed"); setDiscountPercentage(0) }}
                      className={cn(
                        "px-3 h-8 text-xs font-medium transition-colors cursor-pointer",
                        discountType === "fixed"
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Fixed
                    </button>
                  </div>
                </div>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Discount{discountType === "percentage" ? ` (${discountPercentage}%)` : ""}</span>
                  <span className="font-mono">-{formatAmount(discountAmount)}</span>
                </div>
              )}
            </div>
            <div className="border-t border-border pt-4">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-xl font-semibold font-mono">{formatAmount(total)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Button className="w-full h-10 rounded-full" onClick={handleOpenDeliveryDialog} disabled={saving}>
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {isEdit ? "Update Invoice" : "Create Invoice"}
              </Button>
              <Button variant="outline" className="w-full h-10 rounded-full" onClick={() => handleSave("draft")} disabled={saving}>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {saving ? "Saving..." : "Save as Draft"}
              </Button>
            </div>
            {/* Recurring Invoice */}
            {!isEdit && (
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Recurring Invoice</h3>
                  </div>
                  <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                </div>
                {isRecurring && (
                  <div className="space-y-4 pt-2 border-t border-border">
                    <div>
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Day of Month</Label>
                      <Select value={String(recurringDayOfMonth)} onValueChange={(v) => setRecurringDayOfMonth(Number(v))}>
                        <SelectTrigger className="mt-1.5 font-mono"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                            <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground mt-1">Invoice will be generated on this day each month (1-28)</p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={autoSendWhatsApp}
                        onCheckedChange={(v) => setAutoSendWhatsApp(!!v)}
                      />
                      <div className="flex items-center gap-1.5">
                        <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
                        <span className="text-sm">Auto-send via WhatsApp</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New client dialog */}
      <Dialog open={newClientDialog} onOpenChange={setNewClientDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-lg font-semibold">Add New Client</DialogTitle></DialogHeader>
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

      {/* Unsaved changes dialog */}
      <Dialog open={unsavedDialog} onOpenChange={setUnsavedDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Unsaved Changes</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                  You have unsaved changes that will be lost.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-4">
            <Button variant={'outline'} onClick={handleSaveAsDraftAndLeave} disabled={!clientId} className="w-full rounded-full border border-primary text-primary hover:bg-primary/20">
              <Save className="mr-1.5 h-3.5 w-3.5" /> Save as Draft
            </Button>
            {!clientId && (
              <p className="text-[11px] text-muted-foreground text-center -mt-1">Select a client first to save as draft</p>
            )}
            <Button variant="outline" onClick={handleDiscardAndLeave} className="w-full rounded-full text-destructive hover:text-destructive">
              Discard & Leave
            </Button>
            <Button variant="ghost" onClick={() => setUnsavedDialog(false)} className="w-full rounded-full">
              Continue Editing
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delivery channel dialog */}
      <Dialog open={deliveryDialog} onOpenChange={(open) => { if (!delivering) setDeliveryDialog(open) }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Send Invoice</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-0.5">
              Choose how to deliver this invoice to {selectedClient?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <label
              className={cn(
                "flex items-center gap-3 rounded-lg border border-border p-3 transition-colors",
                selectedClient?.phone ? "cursor-pointer hover:bg-accent/50" : "opacity-50 cursor-not-allowed",
                sendViaWhatsApp && "border-primary/50 bg-primary/5"
              )}
            >
              <Checkbox
                checked={sendViaWhatsApp}
                onCheckedChange={(v) => setSendViaWhatsApp(!!v)}
                disabled={!selectedClient?.phone}
              />
              <MessageCircle className="h-4 w-4 text-[#25D366] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">WhatsApp</p>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedClient?.phone || "No phone number on file"}
                </p>
              </div>
            </label>

            {/* <label
              className={cn(
                "flex items-center gap-3 rounded-lg border border-border p-3 transition-colors",
                selectedClient?.email ? "cursor-pointer hover:bg-accent/50" : "opacity-50 cursor-not-allowed",
                sendViaEmail && "border-primary/50 bg-primary/5"
              )}
            >
              <Checkbox
                checked={sendViaEmail}
                onCheckedChange={(v) => setSendViaEmail(!!v)}
                disabled={!selectedClient?.email}
              />
              <Mail className="h-4 w-4 text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedClient?.email || "No email address on file"}
                </p>
              </div>
            </label> */}
          </div>
          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={() => handleCreateAndSend(true)}
              disabled={delivering || !sendViaWhatsApp}
              className="w-full rounded-full"
            >
              {delivering ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Sending...</>
              ) : (
                <><Send className="mr-1.5 h-3.5 w-3.5" /> {isEdit ? "Update & Send" : "Create & Send"}</>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleCreateAndSend(false)}
              disabled={delivering}
              className="w-full rounded-full text-muted-foreground"
            >
              {isEdit ? "Update without sending" : "Save without sending"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
