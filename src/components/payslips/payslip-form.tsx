"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useNavigationGuard } from "@/lib/navigation-guard";
import {
  MONTHS,
  PAYMENT_MODES,
  PAYSLIP_STATUSES,
  PAYSLIP_ITEM_TYPES,
  CURRENCIES,
  computeNetPay,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Plus, Trash2, ArrowLeft, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  createPayslip,
  updatePayslip,
  generateNextSlipNumber,
} from "@/server/actions/payslips";
import type { listEmployees } from "@/server/queries/employees";
import type { getPayslipFull } from "@/server/queries/payslips";
import type { getSettings } from "@/server/queries/settings";

type Employees = Awaited<ReturnType<typeof listEmployees>>;
type FullPayslip = NonNullable<Awaited<ReturnType<typeof getPayslipFull>>>;
type Settings = Awaited<ReturnType<typeof getSettings>>;

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type LineItem = {
  description: string;
  type: "earning" | "deduction";
  amount: number;
  sortOrder: number;
};

const ITEM_SUGGESTIONS: { label: string; type: "earning" | "deduction" }[] = [
  { label: "Monthly allowance", type: "earning" },
  { label: "Basic salary", type: "earning" },
  { label: "Transport allowance", type: "earning" },
  { label: "Housing allowance", type: "earning" },
  { label: "Medical allowance", type: "earning" },
  { label: "Performance bonus", type: "earning" },
  { label: "Overtime", type: "earning" },
  { label: "Commission", type: "earning" },
  { label: "Incentive", type: "earning" },
  { label: "EPF (employee 8%)", type: "deduction" },
  { label: "Salary advance", type: "deduction" },
  { label: "No-pay leave", type: "deduction" },
  { label: "Loan repayment", type: "deduction" },
  { label: "PAYE tax", type: "deduction" },
];

type Props = {
  employees: Employees;
  settings: Settings;
  payslip?: FullPayslip;
};

export function PayslipForm({ employees, settings, payslip }: Props) {
  const router = useRouter();
  const { registerGuard, unregisterGuard } = useNavigationGuard();
  const isEdit = !!payslip;
  const now = new Date();

  const [slipNumber, setSlipNumber] = useState(payslip?.slipNumber ?? "");
  const [employeeId, setEmployeeId] = useState(payslip?.employeeId ?? "");
  const [payPeriodMonth, setPayPeriodMonth] = useState(payslip?.payPeriodMonth ?? now.getMonth() + 1);
  const [payPeriodYear, setPayPeriodYear] = useState(payslip?.payPeriodYear ?? now.getFullYear());
  const [paymentDate, setPaymentDate] = useState(payslip?.paymentDate ?? toLocalDateString(now));
  const [paymentMode, setPaymentMode] = useState<string>(payslip?.paymentMode ?? "bank_transfer");
  const [status, setStatus] = useState<string>(payslip?.status ?? "draft");
  const [currency, setCurrency] = useState(payslip?.currency ?? settings?.defaultCurrency ?? "LKR");
  const [authorizedByName, setAuthorizedByName] = useState(payslip?.authorizedByName ?? "Mohamed Arshaq");
  const [authorizedByTitle, setAuthorizedByTitle] = useState(payslip?.authorizedByTitle ?? "COO");
  const [notes, setNotes] = useState(payslip?.notes ?? "");

  const initialItems: LineItem[] = payslip?.items.length
    ? payslip.items.map((it) => ({
        description: it.description,
        type: it.type,
        amount: Number(it.amount),
        sortOrder: it.sortOrder,
      }))
    : [{ description: "Monthly allowance", type: "earning", amount: 0, sortOrder: 0 }];
  const [items, setItems] = useState<LineItem[]>(initialItems);

  const [saving, setSaving] = useState(false);
  const [unsavedDialog, setUnsavedDialog] = useState(false);
  const pendingNavRef = useRef<string | null>(null);
  const savedRef = useRef(false);
  // Track whether the user has manually touched the items so employee-select doesn't clobber them
  const itemsTouchedRef = useRef(isEdit);

  const isDirty = useCallback(() => {
    if (savedRef.current) return false;
    if (employeeId) return true;
    if (items.some((i) => i.description.trim() || i.amount > 0)) return true;
    return false;
  }, [employeeId, items]);

  useEffect(() => {
    registerGuard((href: string) => {
      if (isDirty()) {
        pendingNavRef.current = href;
        setUnsavedDialog(true);
        return true;
      }
      return false;
    });
    return () => unregisterGuard();
  }, [isDirty, registerGuard, unregisterGuard]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty()) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Regenerate slip number when the payment date changes (new payslips only)
  useEffect(() => {
    if (isEdit || !paymentDate) return;
    let cancelled = false;
    generateNextSlipNumber(paymentDate).then((num) => {
      if (!cancelled) setSlipNumber(num);
    });
    return () => {
      cancelled = true;
    };
  }, [paymentDate, isEdit]);

  function handleEmployeeChange(id: string) {
    setEmployeeId(id);
    const emp = employees.find((e) => e.id === id);
    if (!emp) return;
    setCurrency(emp.currency);
    setPaymentMode(emp.paymentMode);
    // Prefill the basic salary as a Monthly allowance earning if items are untouched
    if (!itemsTouchedRef.current && Number(emp.basicSalary) > 0) {
      setItems([
        { description: "Monthly allowance", type: "earning", amount: Number(emp.basicSalary), sortOrder: 0 },
      ]);
    }
  }

  function handleNavigation(href: string) {
    if (isDirty()) {
      pendingNavRef.current = href;
      setUnsavedDialog(true);
    } else {
      router.push(href);
    }
  }

  function handleDiscardAndLeave() {
    setUnsavedDialog(false);
    savedRef.current = true;
    const dest = pendingNavRef.current || "/payslips";
    pendingNavRef.current = null;
    router.push(dest);
  }

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    itemsTouchedRef.current = true;
    const newItems = [...items];
    (newItems[index] as Record<string, unknown>)[field] = value;
    setItems(newItems);
  }

  function addItem() {
    itemsTouchedRef.current = true;
    setItems([...items, { description: "", type: "earning", amount: 0, sortOrder: items.length }]);
  }

  function applySuggestion(description: string, type: "earning" | "deduction") {
    itemsTouchedRef.current = true;
    const emptyIdx = items.findIndex((i) => !i.description.trim());
    if (emptyIdx !== -1) {
      const newItems = [...items];
      newItems[emptyIdx] = { ...newItems[emptyIdx], description, type };
      setItems(newItems);
    } else {
      setItems([...items, { description, type, amount: 0, sortOrder: items.length }]);
    }
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    itemsTouchedRef.current = true;
    setItems(items.filter((_, i) => i !== index));
  }

  const { grossPay, totalDeductions, netPay } = computeNetPay(items);

  const formatAmount = (amt: number) => {
    const formatted = amt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const curr = CURRENCIES.find((c) => c.value === currency);
    if (!curr) return `${currency} ${formatted}`;
    const sym = curr.symbol;
    if (["$", "£", "€", "₹"].includes(sym) || sym.endsWith("$")) return `${sym}${formatted}`;
    return `${sym} ${formatted}`;
  };

  function validateForm(): boolean {
    if (!employeeId) {
      toast.error("Please select an employee");
      return false;
    }
    if (!slipNumber) {
      toast.error("Slip number not generated yet. Please wait a moment.");
      return false;
    }
    if (items.some((i) => !i.description.trim())) {
      toast.error("All items need a description");
      return false;
    }
    return true;
  }

  async function handleSave() {
    if (!validateForm()) return;
    setSaving(true);
    const payload = {
      slipNumber,
      employeeId,
      payPeriodMonth,
      payPeriodYear,
      paymentDate,
      paymentMode: paymentMode as "bank_transfer" | "cash" | "cheque",
      status: status as "draft" | "paid",
      currency,
      notes: notes || null,
      authorizedByName: authorizedByName || null,
      authorizedByTitle: authorizedByTitle || null,
    };
    const itemsPayload = items.map((item, idx) => ({
      description: item.description,
      type: item.type,
      amount: Number(item.amount),
      sortOrder: idx,
    }));

    try {
      let savedId: string;
      if (isEdit && payslip) {
        await updatePayslip(payslip.id, payload, itemsPayload);
        savedId = payslip.id;
      } else {
        const created = await createPayslip(payload, itemsPayload);
        savedId = created.id;
      }
      toast.success(isEdit ? "Payslip updated" : "Payslip created");
      savedRef.current = true;
      router.push(`/payslips/${savedId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save payslip");
    } finally {
      setSaving(false);
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleNavigation("/payslips")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{isEdit ? "Edit Payslip" : "New Payslip"}</h1>
          {slipNumber && <p className="text-sm font-mono text-muted-foreground mt-0.5">{slipNumber}</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold mb-2">Payslip Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Employee</Label>
                <Select value={employeeId} onValueChange={handleEmployeeChange}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} · {e.employeeNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pay Period Month</Label>
                <Select value={String(payPeriodMonth)} onValueChange={(v) => setPayPeriodMonth(Number(v))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pay Period Year</Label>
                <Select value={String(payPeriodYear)} onValueChange={(v) => setPayPeriodYear(Number(v))}>
                  <SelectTrigger className="mt-1.5 font-mono"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Payment Date</Label>
                <div className="mt-1.5">
                  <DatePicker
                    value={paymentDate ? new Date(paymentDate + "T00:00:00") : undefined}
                    onChange={(date) => date && setPaymentDate(toLocalDateString(date))}
                    placeholder="Select payment date"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Payment Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Slip Number</Label>
                <Input value={slipNumber} readOnly placeholder={isEdit ? "" : "Set a payment date first"} className="mt-1.5 bg-secondary font-mono text-sm" />
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYSLIP_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Earnings & Deductions</h3>
              <Button variant="outline" size="sm" onClick={addItem} className="h-8 text-xs rounded-full cursor-pointer">
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
              </Button>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground self-center mr-1">
                  Earnings
                </span>
                {ITEM_SUGGESTIONS.filter((s) => s.type === "earning").map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => applySuggestion(s.label, s.type)}
                    className="px-2.5 py-1 text-xs rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/10 transition-colors cursor-pointer"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground self-center mr-1">
                  Deductions
                </span>
                {ITEM_SUGGESTIONS.filter((s) => s.type === "deduction").map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => applySuggestion(s.label, s.type)}
                    className="px-2.5 py-1 text-xs rounded-full border border-border text-muted-foreground hover:text-red-400 hover:border-red-400/40 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-[10px] font-mono font-medium uppercase tracking-wider text-muted-foreground px-1">
                <div className="col-span-6">Description</div>
                <div className="col-span-3">Type</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-1"></div>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-12 items-start rounded-lg border border-border p-3 sm:border-0 sm:p-0">
                  <div className="sm:col-span-6">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground sm:hidden">Description</label>
                    <Input
                      placeholder="e.g. Monthly allowance"
                      value={item.description}
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:contents">
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground sm:hidden">Type</label>
                      <Select value={item.type} onValueChange={(v) => updateItem(idx, "type", v)}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PAYSLIP_ITEM_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground sm:hidden">Amount</label>
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={item.amount}
                        onChange={(e) => updateItem(idx, "amount", parseFloat(e.target.value) || 0)}
                        min={0}
                        className="font-mono text-sm"
                      />
                    </div>
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

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold">Authorization & Notes</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Authorized By</Label>
                <Input value={authorizedByName} onChange={(e) => setAuthorizedByName(e.target.value)} placeholder="e.g. Mohamed Arshaq" className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Title</Label>
                <Input value={authorizedByTitle} onChange={(e) => setAuthorizedByTitle(e.target.value)} placeholder="e.g. COO" className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional notes..." className="mt-1.5 text-sm" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 sticky top-24 space-y-4">
            <h3 className="text-sm font-semibold">Summary</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gross Pay</span>
              <span className="font-mono font-medium">{formatAmount(grossPay)}</span>
            </div>
            {totalDeductions > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Deductions</span>
                <span className="font-mono">-{formatAmount(totalDeductions)}</span>
              </div>
            )}
            <div className="border-t border-border pt-4">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold">Net Pay</span>
                <span className="text-xl font-semibold font-mono">{formatAmount(netPay)}</span>
              </div>
            </div>
            <Button className="w-full h-10 rounded-full" onClick={handleSave} disabled={saving}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {saving ? "Saving..." : isEdit ? "Update Payslip" : "Create Payslip"}
            </Button>
          </div>
        </div>
      </div>

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
            <Button variant="outline" onClick={handleDiscardAndLeave} className="w-full rounded-full text-destructive hover:text-destructive">
              Discard & Leave
            </Button>
            <Button variant="ghost" onClick={() => setUnsavedDialog(false)} className="w-full rounded-full">
              Continue Editing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
