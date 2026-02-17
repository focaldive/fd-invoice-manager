"use client"

import { AppShell } from "@/components/app-shell"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Invoice, formatCurrency, getStatusInfo, CATEGORIES, CURRENCIES } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, FileText, Clock, AlertTriangle, ArrowUpRight, Plus, ChevronLeft, ChevronRight } from "lucide-react"
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

interface DashboardData {
  outstandingAmount: number
  invoiceCounts: Record<string, number>
  recentInvoices: Invoice[]
}

export default function DashboardPage() {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [data, setData] = useState<DashboardData>({
    outstandingAmount: 0,
    invoiceCounts: {},
    recentInvoices: [],
  })
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([])
  const [currency, setCurrency] = useState("LKR")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  // Revenue card filters
  const [revenueYear, setRevenueYear] = useState(currentYear)
  const [revenueMonth, setRevenueMonth] = useState(currentMonth)

  // Chart year filter
  const [chartYear, setChartYear] = useState(currentYear)

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
    const fetched = (invoices || []) as Invoice[]
    setAllInvoices(fetched)

    const outstandingAmount = fetched
      .filter((i) => i.status === "sent" || i.status === "overdue")
      .reduce((sum, i) => sum + Number(i.total), 0)

    const invoiceCounts: Record<string, number> = {}
    fetched.forEach((i) => {
      invoiceCounts[i.status] = (invoiceCounts[i.status] || 0) + 1
    })

    setData({
      outstandingAmount,
      invoiceCounts,
      recentInvoices: fetched.slice(0, 5),
    })
    setLoading(false)
  }

  // Available years derived from invoices
  const availableYears = Array.from(
    new Set(allInvoices.map((i) => new Date(i.date_of_issue).getFullYear()))
  ).sort((a, b) => b - a)
  if (!availableYears.includes(currentYear)) availableYears.unshift(currentYear)

  // Revenue card — filtered by month/year
  const filteredRevenue = allInvoices
    .filter((i) => {
      if (i.status !== "paid") return false
      const d = new Date(i.date_of_issue)
      if (d.getFullYear() !== revenueYear) return false
      if (revenueMonth > 0 && d.getMonth() + 1 !== revenueMonth) return false
      return true
    })
    .reduce((sum, i) => sum + Number(i.total), 0)

  const revenueSubText = revenueMonth > 0
    ? `${MONTHS[revenueMonth - 1]} ${revenueYear}`
    : `${revenueYear} — All months`

  // Monthly revenue chart — filtered by chartYear
  const monthlyRevenue = MONTHS.map((m, idx) => {
    const amount = allInvoices
      .filter((i) => i.status === "paid" && new Date(i.date_of_issue).getFullYear() === chartYear && new Date(i.date_of_issue).getMonth() === idx)
      .reduce((sum, i) => sum + Number(i.total), 0)
    return { month: m, amount }
  })

  const totalInvoices = Object.entries(data.invoiceCounts)
    .filter(([status]) => status !== "cancelled")
    .reduce((s, [, c]) => s + c, 0)

  const stats = [
    {
      label: "Revenue",
      value: formatCurrency(filteredRevenue, currency),
      sub: revenueSubText,
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
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">Dashboard</h1>
          <div className="flex flex-wrap gap-2">
            <Link href="/invoices/new">
              <Button size="sm" className="h-9 rounded-full">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> New Invoice
              </Button>
            </Link>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-[100px] h-9 text-xs font-mono bg-secondary border-border rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.value}</SelectItem>
                ))}
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
          {/* Revenue card with filters */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Revenue</p>
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", "bg-primary/10")}>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight font-mono">{formatCurrency(filteredRevenue, currency)}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <Select value={String(revenueMonth)} onValueChange={(v) => setRevenueMonth(Number(v))}>
                <SelectTrigger className="h-7 w-[90px] text-[11px] font-mono bg-secondary border-border rounded-full px-2.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All Months</SelectItem>
                  {MONTHS.map((m, idx) => (
                    <SelectItem key={m} value={String(idx + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(revenueYear)} onValueChange={(v) => setRevenueYear(Number(v))}>
                <SelectTrigger className="h-7 w-[75px] text-[11px] font-mono bg-secondary border-border rounded-full px-2.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Other stat cards */}
          {stats.slice(1).map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", stat.bg)}>
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight font-mono">{stat.value}</p>
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
                <p className="text-xs text-muted-foreground mt-0.5">{chartYear} breakdown</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setChartYear((y) => y - 1)}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <Select value={String(chartYear)} onValueChange={(v) => setChartYear(Number(v))}>
                  <SelectTrigger className="h-7 w-[75px] text-[11px] font-mono bg-secondary border-border rounded-full px-2.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => setChartYear((y) => y + 1)}
                  disabled={chartYear >= currentYear}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue} barSize={28}>
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
                    tickFormatter={(v) => {
                      const sym = CURRENCIES.find(c => c.value === currency)?.symbol || currency
                      return `${sym}${(v / 1000).toFixed(0)}k`
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value, currency), "Revenue"]}
                    cursor={{ fill: "var(--accent)" }}
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
                          {inv.client?.name || "No client"}
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
