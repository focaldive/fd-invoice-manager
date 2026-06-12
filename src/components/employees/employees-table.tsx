"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DEPARTMENTS,
  getDesignationsForDepartment,
  PAYMENT_MODES,
  EMPLOYEE_STATUSES,
  CURRENCIES,
} from "@/lib/types";
import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  generateNextEmployeeNumber,
} from "@/server/actions/employees";
import type { listEmployees } from "@/server/queries/employees";

type EmployeeRow = Awaited<ReturnType<typeof listEmployees>>[number];

type FormState = {
  employeeNumber: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  joinedDate: string;
  status: "active" | "inactive";
  paymentMode: "bank_transfer" | "cash" | "cheque";
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBranch: string;
  basicSalary: number;
  currency: string;
};

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const emptyForm: FormState = {
  employeeNumber: "",
  name: "",
  email: "",
  phone: "",
  department: "Designing",
  designation: "",
  joinedDate: toLocalDateString(new Date()),
  status: "active",
  paymentMode: "bank_transfer",
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankBranch: "",
  basicSalary: 0,
  currency: "LKR",
};

function toActionInput(form: FormState) {
  return {
    employeeNumber: form.employeeNumber,
    name: form.name.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    department: form.department,
    designation: form.designation.trim(),
    joinedDate: form.joinedDate || null,
    status: form.status,
    paymentMode: form.paymentMode,
    bankName: form.bankName.trim() || null,
    bankAccountName: form.bankAccountName.trim() || null,
    bankAccountNumber: form.bankAccountNumber.trim() || null,
    bankBranch: form.bankBranch.trim() || null,
    basicSalary: form.basicSalary,
    currency: form.currency,
  };
}

export function EmployeesTable({ employees }: { employees: EmployeeRow[] }) {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isPending, startTransition] = useTransition();

  // Auto-generate employee number for new employees when department/joined date changes
  useEffect(() => {
    if (!dialogOpen || editing || !form.department) return;
    let cancelled = false;
    generateNextEmployeeNumber(
      form.department,
      form.joinedDate || toLocalDateString(new Date()),
    ).then((num) => {
      if (!cancelled) setForm((f) => ({ ...f, employeeNumber: num }));
    });
    return () => {
      cancelled = true;
    };
  }, [dialogOpen, editing, form.department, form.joinedDate]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(employee: EmployeeRow) {
    setEditing(employee);
    setForm({
      employeeNumber: employee.employeeNumber,
      name: employee.name,
      email: employee.email ?? "",
      phone: employee.phone ?? "",
      department: employee.department,
      designation: employee.designation,
      joinedDate: employee.joinedDate ?? "",
      status: employee.status,
      paymentMode: employee.paymentMode,
      bankName: employee.bankName ?? "",
      bankAccountName: employee.bankAccountName ?? "",
      bankAccountNumber: employee.bankAccountNumber ?? "",
      bankBranch: employee.bankBranch ?? "",
      basicSalary: Number(employee.basicSalary),
      currency: employee.currency,
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast.error("Employee name is required");
      return;
    }
    if (!form.designation.trim()) {
      toast.error("Designation is required");
      return;
    }
    if (!form.employeeNumber) {
      toast.error("Employee number not generated yet. Please wait a moment.");
      return;
    }
    startTransition(async () => {
      try {
        const input = toActionInput(form);
        if (editing) {
          await updateEmployee(editing.id, input);
          toast.success("Employee updated");
        } else {
          await createEmployee(input);
          toast.success("Employee created");
        }
        setDialogOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save employee");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this employee? Their payslips will be kept but unlinked.")) return;
    startTransition(async () => {
      try {
        await deleteEmployee(id);
        toast.success("Employee deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete employee");
      }
    });
  }

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeNumber.toLowerCase().includes(search.toLowerCase()) ||
      e.department.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">Employees</h1>
        <Button size="sm" onClick={openCreate} className="h-9 rounded-full">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Employee
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, emp no, or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm bg-secondary border-border rounded-full"
        />
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="text-xs text-muted-foreground font-medium">Emp No</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">Name</TableHead>
              <TableHead className="hidden sm:table-cell text-xs text-muted-foreground font-medium">Designation</TableHead>
              <TableHead className="hidden md:table-cell text-xs text-muted-foreground font-medium">Department</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">Status</TableHead>
              <TableHead className="w-[100px] text-xs text-muted-foreground font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16">
                  <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No employees found</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((employee) => (
                <TableRow key={employee.id} className="group border-b border-border hover:bg-secondary/50">
                  <TableCell className="font-mono text-sm">{employee.employeeNumber}</TableCell>
                  <TableCell>
                    <Link href={`/employees/${employee.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                      {employee.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{employee.designation}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{employee.department}</TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "text-[11px] font-medium px-2.5 py-0.5 rounded-full border-0",
                        employee.status === "active"
                          ? "bg-primary/20 text-primary"
                          : "bg-gray-500/20 text-gray-400",
                      )}
                    >
                      {employee.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(employee)} disabled={isPending}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(employee.id)} disabled={isPending}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{editing ? "Edit Employee" : "Add Employee"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" className="mt-1.5" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+94 77 123 4567" className="mt-1.5 font-mono" />
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Joined Date</Label>
                <div className="mt-1.5">
                  <DatePicker
                    value={form.joinedDate ? new Date(form.joinedDate + "T00:00:00") : undefined}
                    onChange={(date) => date && setForm({ ...form, joinedDate: toLocalDateString(date) })}
                    placeholder="Select joined date"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Department</Label>
                <Select
                  value={form.department}
                  onValueChange={(v) => {
                    const allowed = getDesignationsForDepartment(v);
                    setForm((f) => ({
                      ...f,
                      department: v,
                      designation: allowed.includes(f.designation) ? f.designation : "",
                    }));
                  }}
                >
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Designation *</Label>
                <Select value={form.designation} onValueChange={(v) => setForm({ ...form, designation: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select designation" /></SelectTrigger>
                  <SelectContent>
                    {form.designation && !getDesignationsForDepartment(form.department).includes(form.designation) && (
                      <SelectItem value={form.designation}>{form.designation}</SelectItem>
                    )}
                    {getDesignationsForDepartment(form.department).map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Employee Number</Label>
                <Input value={form.employeeNumber} readOnly className="mt-1.5 bg-secondary font-mono text-sm" placeholder="Auto-generated" />
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as FormState["status"] })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Payment Mode</Label>
                <Select value={form.paymentMode} onValueChange={(v) => setForm({ ...form, paymentMode: v as FormState["paymentMode"] })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger className="mt-1.5 font-mono"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Basic Salary</Label>
                <Input type="number" min={0} value={form.basicSalary} onChange={(e) => setForm({ ...form, basicSalary: parseFloat(e.target.value) || 0 })} className="mt-1.5 font-mono" />
              </div>
            </div>

            <div className="rounded-lg border border-border p-4 space-y-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Bank Details</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Bank Name</Label>
                  <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="e.g. Commercial Bank" className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Account Name</Label>
                  <Input value={form.bankAccountName} onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })} placeholder="Account holder name" className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Account Number</Label>
                  <Input value={form.bankAccountNumber} onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })} placeholder="Account number" className="mt-1.5 font-mono" />
                </div>
                <div>
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Branch</Label>
                  <Input value={form.bankBranch} onChange={(e) => setForm({ ...form, bankBranch: e.target.value })} placeholder="Branch" className="mt-1.5" />
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={isPending} className="w-full">
              {isPending ? "Saving..." : editing ? "Update Employee" : "Create Employee"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
