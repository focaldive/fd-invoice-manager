"use client"

import { AppShell } from "@/components/app-shell"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Client, Invoice, formatCurrency, getStatusInfo } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function ClientDetailPage() {
  const params = useParams()
  const [client, setClient] = useState<Client | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [params.id])

  async function fetchData() {
    const { data: c } = await supabase.from("clients").select("*").eq("id", params.id).single()
    setClient(c)
    const { data: inv } = await supabase
      .from("invoices")
      .select("*")
      .eq("client_id", params.id)
      .order("date_of_issue", { ascending: false })
    setInvoices(inv || [])
    setLoading(false)
  }

  if (loading) return <AppShell><div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading...</div></AppShell>
  if (!client) return <AppShell><div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Client not found</div></AppShell>

  const lkrInvoices = invoices.filter(i => i.currency === 'LKR')
  const usdInvoices = invoices.filter(i => i.currency === 'USD')

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon" className="h-9 w-9"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              {client.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</span>}
              {client.phone && <span className="flex items-center gap-1 font-mono"><Phone className="h-3 w-3" />{client.phone}</span>}
              {client.country && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{client.country}</span>}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Total Billed</p>
            {lkrInvoices.length > 0 && <p className="text-lg font-bold font-mono mt-1">{formatCurrency(lkrInvoices.reduce((s,i)=>s+Number(i.total),0), 'LKR')}</p>}
            {usdInvoices.length > 0 && <p className="text-lg font-bold font-mono mt-1">{formatCurrency(usdInvoices.reduce((s,i)=>s+Number(i.total),0), 'USD')}</p>}
            {invoices.length === 0 && <p className="text-lg font-bold font-mono text-muted-foreground mt-1">-</p>}
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Total Paid</p>
            {lkrInvoices.length > 0 && <p className="text-lg font-bold font-mono text-primary mt-1">{formatCurrency(lkrInvoices.filter(i=>i.status==='paid').reduce((s,i)=>s+Number(i.total),0), 'LKR')}</p>}
            {usdInvoices.length > 0 && <p className="text-lg font-bold font-mono text-primary mt-1">{formatCurrency(usdInvoices.filter(i=>i.status==='paid').reduce((s,i)=>s+Number(i.total),0), 'USD')}</p>}
            {invoices.length === 0 && <p className="text-lg font-bold font-mono text-muted-foreground mt-1">-</p>}
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Outstanding</p>
            {lkrInvoices.length > 0 && <p className="text-lg font-bold font-mono text-amber-400 mt-1">{formatCurrency(lkrInvoices.filter(i=>['sent','overdue'].includes(i.status)).reduce((s,i)=>s+Number(i.total),0), 'LKR')}</p>}
            {usdInvoices.length > 0 && <p className="text-lg font-bold font-mono text-amber-400 mt-1">{formatCurrency(usdInvoices.filter(i=>['sent','overdue'].includes(i.status)).reduce((s,i)=>s+Number(i.total),0), 'USD')}</p>}
            {invoices.length === 0 && <p className="text-lg font-bold font-mono text-muted-foreground mt-1">-</p>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Invoice History</h3>
          </div>
          <div className="p-3">
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No invoices for this client</p>
            ) : (
              <div className="space-y-1">
                {invoices.map((inv) => {
                  const statusInfo = getStatusInfo(inv.status)
                  return (
                    <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between rounded-lg p-3 hover:bg-secondary transition-colors group">
                      <div>
                        <p className="text-sm font-mono font-medium group-hover:text-primary transition-colors">{inv.invoice_number}</p>
                        <p className="text-xs text-muted-foreground font-mono">{new Date(inv.date_of_issue).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-semibold">{formatCurrency(Number(inv.total), inv.currency)}</p>
                        <Badge
                          className={cn(
                            "text-[10px] font-medium px-2 py-0 rounded-full border-0",
                            inv.status === "paid" ? "bg-primary/20 text-primary" :
                            inv.status === "draft" ? "bg-blue-500/20 text-blue-400" :
                            ["sent", "overdue"].includes(inv.status) ? "bg-amber-500/20 text-amber-400" :
                            "bg-red-500/20 text-red-400"
                          )}
                        >
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
