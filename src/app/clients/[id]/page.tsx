import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, getStatusInfo } from "@/lib/types";
import { getClientWithInvoices } from "@/server/queries/clients";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientWithInvoices(id);

  if (!client) notFound();

  const invoices = client.invoices;
  const lkrInvoices = invoices.filter((i) => i.currency === "LKR");
  const usdInvoices = invoices.filter((i) => i.currency === "USD");

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon" className="h-9 w-9"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{client.name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
              {client.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</span>}
              {client.phone && <span className="flex items-center gap-1 font-mono"><Phone className="h-3 w-3" />{client.phone}</span>}
              {client.country && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{client.country}</span>}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Total Billed</p>
            {lkrInvoices.length > 0 && <p className="text-lg font-semibold font-mono mt-1">{formatCurrency(lkrInvoices.reduce((s, i) => s + Number(i.total), 0), "LKR")}</p>}
            {usdInvoices.length > 0 && <p className="text-lg font-semibold font-mono mt-1">{formatCurrency(usdInvoices.reduce((s, i) => s + Number(i.total), 0), "USD")}</p>}
            {invoices.length === 0 && <p className="text-lg font-semibold font-mono text-muted-foreground mt-1">-</p>}
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Total Paid</p>
            {lkrInvoices.length > 0 && <p className="text-lg font-semibold font-mono text-primary mt-1">{formatCurrency(lkrInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total), 0), "LKR")}</p>}
            {usdInvoices.length > 0 && <p className="text-lg font-semibold font-mono text-primary mt-1">{formatCurrency(usdInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total), 0), "USD")}</p>}
            {invoices.length === 0 && <p className="text-lg font-semibold font-mono text-muted-foreground mt-1">-</p>}
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Outstanding</p>
            {lkrInvoices.length > 0 && <p className="text-lg font-semibold font-mono text-amber-400 mt-1">{formatCurrency(lkrInvoices.filter((i) => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + Number(i.total), 0), "LKR")}</p>}
            {usdInvoices.length > 0 && <p className="text-lg font-semibold font-mono text-amber-400 mt-1">{formatCurrency(usdInvoices.filter((i) => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + Number(i.total), 0), "USD")}</p>}
            {invoices.length === 0 && <p className="text-lg font-semibold font-mono text-muted-foreground mt-1">-</p>}
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
                  const statusInfo = getStatusInfo(inv.status);
                  return (
                    <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between rounded-lg p-3 hover:bg-secondary transition-colors group">
                      <div>
                        <p className="text-sm font-mono font-medium group-hover:text-primary transition-colors">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground font-mono">{new Date(inv.dateOfIssue).toLocaleDateString()}</p>
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
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
