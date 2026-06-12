import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, Briefcase, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  getMonthLabel,
  getPayslipStatusInfo,
} from "@/lib/types";
import { getEmployeeWithPayslips } from "@/server/queries/employees";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await getEmployeeWithPayslips(id);

  if (!employee) notFound();

  const payslips = employee.payslips;
  const totalPaid = payslips
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.netPay), 0);

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/employees">
            <Button variant="ghost" size="icon" className="h-9 w-9"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{employee.name}</h1>
              <span className="text-sm font-mono text-muted-foreground">{employee.employeeNumber}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{employee.designation}</span>
              <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{employee.department}</span>
              {employee.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{employee.email}</span>}
              {employee.phone && <span className="flex items-center gap-1 font-mono"><Phone className="h-3 w-3" />{employee.phone}</span>}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Basic Salary</p>
            <p className="text-lg font-semibold font-mono mt-1">{formatCurrency(Number(employee.basicSalary), employee.currency)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Total Paid</p>
            <p className="text-lg font-semibold font-mono text-primary mt-1">{formatCurrency(totalPaid, employee.currency)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Payslips</p>
            <p className="text-lg font-semibold font-mono mt-1">{payslips.length}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold">Payslip History</h3>
            <Link href="/payslips/new">
              <Button size="sm" variant="outline" className="h-8 rounded-full text-xs">New Payslip</Button>
            </Link>
          </div>
          <div className="p-3">
            {payslips.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No payslips for this employee</p>
            ) : (
              <div className="space-y-1">
                {payslips.map((p) => {
                  const statusInfo = getPayslipStatusInfo(p.status);
                  return (
                    <Link key={p.id} href={`/payslips/${p.id}`} className="flex items-center justify-between rounded-lg p-3 hover:bg-secondary transition-colors group">
                      <div>
                        <p className="text-sm font-mono font-medium group-hover:text-primary transition-colors">{p.slipNumber}</p>
                        <p className="text-xs text-muted-foreground">{getMonthLabel(p.payPeriodMonth)} {p.payPeriodYear}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-semibold">{formatCurrency(Number(p.netPay), p.currency)}</p>
                        <Badge
                          className={cn(
                            "text-[10px] font-medium px-2 py-0 rounded-full border-0",
                            p.status === "paid" ? "bg-primary/20 text-primary" : "bg-blue-500/20 text-blue-400",
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
