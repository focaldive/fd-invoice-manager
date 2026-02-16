"use client"

import { AppShell } from "@/components/app-shell"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Invoice, formatCurrency, getStatusInfo, CATEGORIES } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, FileText, Clock, AlertTriangle, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface DashboardData {
  totalRevenue: number
  outstandingAmount: number
  invoiceCounts: Record<string, number>
  recentInvoices: Invoice[]
  monthlyRevenue: { month: string; amount: number }[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    totalRevenue: 0,
    outstandingAmount: 0,
    invoiceCounts: {},
    recentInvoices: [],
    monthlyRevenue: [],
  })
  const [currency, setCurrency] = useState<"LKR" | "USD">("LKR")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [currency, categoryFilter])

  async function fetchDashboard() {
    setLoading(true)

    let query = supabase
      .from("invoices")
      .select("*, client:clients(*)")
      .eq("currency", currency)

    if (categoryFilter !== "all") {
      query = query.eq("category", categoryFilter)
    }

    const { data: invoices } = await query.order("created_at", { ascending: false })
    const allInvoices = (invoices || []) as Invoice[]

    const totalRevenue = allInvoices
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + Number(i.total), 0)

    const outstandingAmount = allInvoices
      .filter((i) => i.status === "sent" || i.status === "overdue")
      .reduce((sum, i) => sum + Number(i.total), 0)

    const invoiceCounts: Record<string, number> = {}
    allInvoices.forEach((i) => {
      invoiceCounts[i.status] = (invoiceCounts[i.status] || 0) + 1
    })

    const currentYear = new Date().getFullYear()
    const monthlyMap: Record<string, number> = {}
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    months.forEach((m) => (monthlyMap[m] = 0))

    allInvoices
      .filter((i) => i.status === "paid" && new Date(i.date_of_issue).getFullYear() === currentYear)
      .forEach((i) => {
        const monthIdx = new Date(i.date_of_issue).getMonth()
        monthlyMap[months[monthIdx]] += Number(i.total)
      })

    const monthlyRevenue = months.map((m) => ({ month: m, amount: monthlyMap[m] }))

    setData({
      totalRevenue,
      outstandingAmount,
      invoiceCounts,
      recentInvoices: allInvoices.slice(0, 5),
      monthlyRevenue,
    })
    setLoading(false)
  }

  const totalInvoices = Object.values(data.invoiceCounts).reduce((s, c) => s + c, 0)

  const stats = [
    {
      label: "Revenue",
      value: formatCurrency(data.totalRevenue, currency),
      sub: "From paid invoices",
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Outstanding",
      value: formatCurrency(data.outstandingAmount, currency),
      sub: "Unpaid invoices",
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
    },
    {
      label: "Invoices",
      value: String(totalInvoices),
      sub: `${data.invoiceCounts.paid || 0} paid, ${data.invoiceCounts.sent || 0} sent`,
      icon: FileText,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "Overdue",
      value: String(data.invoiceCounts.overdue || 0),
      sub: "Needs attention",
      icon: AlertTriangle,
      color: "text-red-400",
      bg: "bg-red-400/10",
    },
  ]

  return (
    <AppShell>
      <div className="space-y-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-5xl font-bold tracking-tight">Dashboard</h1>
          <div className="flex gap-2">
            <Select value={currency} onValueChange={(v) => setCurrency(v as "LKR" | "USD")}>
              <SelectTrigger className="w-[100px] h-9 text-xs font-mono bg-secondary border-border rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LKR">LKR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] h-9 text-xs bg-secondary border-border rounded-full">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", stat.bg)}>
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight font-mono">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Chart + Recent Invoices */}
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold">Monthly Revenue</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{new Date().getFullYear()} breakdown</p>
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyRevenue} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontFamily: "var(--font-jetbrains-mono)", fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontFamily: "var(--font-jetbrains-mono)", fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => currency === "USD" ? `$${(v/1000).toFixed(0)}k` : `${(v/1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value, currency), "Revenue"]}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      fontSize: "12px",
                      fontFamily: "var(--font-jetbrains-mono)",
                      color: "var(--foreground)",
                    }}
                  />
                  <Bar dataKey="amount" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold">Recent Invoices</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Latest activity</p>
              </div>
              <Link href="/invoices" className="text-xs text-primary hover:underline font-medium flex items-center gap-0.5">
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            {data.recentInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No invoices yet</p>
                <Link href="/invoices/new" className="mt-2 text-xs text-primary hover:underline font-medium">
                  Create your first invoice
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {data.recentInvoices.map((inv) => {
                  const statusInfo = getStatusInfo(inv.status)
                  return (
                    <Link
                      key={inv.id}
                      href={`/invoices/${inv.id}`}
                      className="flex items-center justify-between rounded-lg p-3 hover:bg-secondary transition-colors group"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-mono font-medium truncate group-hover:text-primary transition-colors">{inv.invoice_number}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {(inv as any).client?.name || "No client"}
                        </p>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
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
