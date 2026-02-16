"use client"

import { AppShell } from "@/components/app-shell"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Invoice, Settings, CATEGORIES, formatCurrency, getCategoryLabel, getStatusInfo } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, MoreHorizontal, Eye, Download, Copy, XCircle, CheckCircle, Pencil, LayoutGrid, List } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { generateInvoicePDF } from "@/lib/pdf"
import { cn } from "@/lib/utils"

type StatusTab = "all" | "paid" | "unpaid" | "draft" | "cancelled"

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusTab, setStatusTab] = useState<StatusTab>("all")
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid")

  useEffect(() => {
    fetchInvoices()
  }, [])

  async function fetchInvoices() {
    setLoading(true)
    const [{ data }, { data: stgs }] = await Promise.all([
      supabase.from("invoices").select("*, client:clients(*)").order("created_at", { ascending: false }),
      supabase.from("settings").select("*").limit(1).single(),
    ])
    setInvoices((data || []) as Invoice[])
    if (stgs) setSettings(stgs as Settings)
    setLoading(false)
  }

  async function markAsPaid(id: string) {
    const { error } = await supabase.from("invoices").update({ status: "paid", updated_at: new Date().toISOString() }).eq("id", id)
    if (error) { toast.error("Failed"); return }
    toast.success("Marked as paid")
    fetchInvoices()
  }

  async function cancelInvoice(id: string) {
    if (!confirm("Cancel this invoice?")) return
    const { error } = await supabase.from("invoices").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id)
    if (error) { toast.error("Failed"); return }
    toast.success("Invoice cancelled")
    fetchInvoices()
  }

  async function duplicateInvoice(invoice: Invoice) {
    const year = new Date().getFullYear()
    const { data: existing } = await supabase
      .from("invoices")
      .select("invoice_number")
      .like("invoice_number", `FD-INV-${year}-%`)
      .order("invoice_number", { ascending: false })
      .limit(1)

    let nextNum = 1
    if (existing && existing.length > 0) {
      const parts = existing[0].invoice_number.split("-")
      nextNum = parseInt(parts[3]) + 1
    }
    const newNumber = `FD-INV-${year}-${String(nextNum).padStart(4, "0")}`
    const today = new Date().toISOString().split("T")[0]
    const due = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]

    const { data: newInv, error } = await supabase
      .from("invoices")
      .insert({
        invoice_number: newNumber,
        client_id: invoice.client_id,
        date_of_issue: today,
        date_due: due,
        status: "draft",
        subtotal: invoice.subtotal,
        tax_percentage: invoice.tax_percentage,
        tax_amount: invoice.tax_amount,
        discount_percentage: invoice.discount_percentage,
        discount_amount: invoice.discount_amount,
        total: invoice.total,
        currency: invoice.currency,
        notes: invoice.notes,
        category: invoice.category,
      })
      .select()
      .single()

    if (error || !newInv) { toast.error("Failed to duplicate"); return }

    const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoice.id)
    if (items && items.length > 0) {
      await supabase.from("invoice_items").insert(
        items.map((item) => ({
          invoice_id: newInv.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          sort_order: item.sort_order,
        }))
      )
    }

    toast.success("Invoice duplicated")
    router.push(`/invoices/${newInv.id}/edit`)
  }

  async function downloadPDF(invoice: Invoice) {
    const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoice.id).order("sort_order")
    const fullInvoice = { ...invoice, items: items || [] }
    await generateInvoicePDF(fullInvoice, settings)
  }

  const filtered = invoices.filter((inv) => {
    if (statusTab === "paid") return inv.status === "paid"
    if (statusTab === "unpaid") return ["sent", "overdue"].includes(inv.status)
    if (statusTab === "draft") return inv.status === "draft"
    if (statusTab === "cancelled") return inv.status === "cancelled"
    return true
  })

  const tabs: { key: StatusTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "paid", label: "Paid" },
    { key: "unpaid", label: "Not Paid" },
    { key: "draft", label: "Draft" },
    { key: "cancelled", label: "Cancelled" },
  ]

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Page Title */}
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">Invoices</h1>

        {/* Tabs + View Toggle */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-0 border border-border rounded-full p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusTab(tab.key)}
                className={cn(
                  "px-5 py-1.5 text-sm font-medium rounded-full transition-colors",
                  statusTab === tab.key
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
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
                  viewMode === "list"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-3.5 w-3.5" /> List
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-full transition-colors",
                  viewMode === "grid"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Grid
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <p className="text-center text-muted-foreground py-20 text-sm">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-sm">No invoices found</p>
            <Link href="/invoices/new" className="text-primary text-sm mt-2 inline-block hover:underline">
              Create your first invoice
            </Link>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((inv) => {
              const statusInfo = getStatusInfo(inv.status)
              return (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="group block rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:bg-primary/20 transition-all min-h-[280px]"
                >
                  <div className="flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between mb-8">
                      <span className="text-sm font-mono font-semibold">{inv.invoice_number}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); downloadPDF(inv) }}
                          className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <Badge
                          className={cn(
                            "text-[11px] font-medium px-2.5 py-0.5 rounded-full border-0",
                            inv.status === "paid" ? "bg-primary/20 text-primary" :
                              inv.status === "draft" ? "bg-blue-500/20 text-blue-400" :
                                ["sent", "overdue"].includes(inv.status) ? "bg-amber-500/20 text-amber-400" :
                                  "bg-red-500/20 text-red-400"
                          )}
                        >
                          {inv.status === "paid" ? "Paid" :
                            inv.status === "draft" ? "Draft" :
                              ["sent", "overdue"].includes(inv.status) ? "Not Paid" :
                                "Cancelled"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <div className="space-y-1 mb-4">
                        <p className="text-lg font-medium text-primary group-hover:underline">
                          {inv.client?.name || "No client"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getCategoryLabel(inv.category)}
                        </p>
                      </div>
                      <p className="text-xl font-semibold font-mono tracking-tighter">
                        {formatCurrency(Number(inv.total), inv.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Due {new Date(inv.date_due).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      {["sent", "overdue"].includes(inv.status) && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); markAsPaid(inv.id) }}
                          className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Mark as Paid
                        </button>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          /* List View */
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
                {filtered.map((inv) => (
                  <TableRow key={inv.id} className="group border-b border-border hover:bg-secondary/50">
                    <TableCell className="font-mono text-sm font-medium">{inv.invoice_number}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm font-medium">{getCategoryLabel(inv.category)}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{inv.client?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "text-[11px] font-medium px-2.5 py-0.5 rounded-full border-0",
                          inv.status === "paid" ? "bg-primary/20 text-primary" :
                            inv.status === "draft" ? "bg-blue-500/20 text-blue-400" :
                              ["sent", "overdue"].includes(inv.status) ? "bg-amber-500/20 text-amber-400" :
                                "bg-red-500/20 text-red-400"
                        )}
                      >
                        {inv.status === "paid" ? "Paid" :
                          inv.status === "draft" ? "Draft" :
                            ["sent", "overdue"].includes(inv.status) ? "Not Paid" :
                              "Cancelled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {new Date(inv.date_of_issue).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {new Date(inv.date_due).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
                          <DropdownMenuItem onClick={() => downloadPDF(inv)}>
                            <Download className="mr-2 h-3.5 w-3.5" /> Download PDF
                          </DropdownMenuItem>
                          {["sent", "overdue"].includes(inv.status) && (
                            <DropdownMenuItem onClick={() => markAsPaid(inv.id)}>
                              <CheckCircle className="mr-2 h-3.5 w-3.5" /> Mark as Paid
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => duplicateInvoice(inv)}>
                            <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
                          </DropdownMenuItem>
                          {inv.status !== "cancelled" && inv.status !== "paid" && (
                            <DropdownMenuItem onClick={() => cancelInvoice(inv.id)} className="text-destructive">
                              <XCircle className="mr-2 h-3.5 w-3.5" /> Cancel
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppShell>
  )
}
