"use server";

import { db } from "@/server/db/client";
import {
  employees,
  employeeStatuses,
  paymentModes,
} from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { nextEmployeeNumber } from "@/server/payslip-numbering";

export async function generateNextEmployeeNumber(
  department: string,
  joinedDate: string,
) {
  return nextEmployeeNumber(department, new Date(joinedDate));
}

const EmployeeInput = z.object({
  employeeNumber: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  department: z.string().min(1),
  designation: z.string().min(1),
  joinedDate: z.string().nullable().optional(),
  status: z.enum(employeeStatuses).default("active"),
  paymentMode: z.enum(paymentModes).default("bank_transfer"),
  bankName: z.string().nullable().optional(),
  bankAccountName: z.string().nullable().optional(),
  bankAccountNumber: z.string().nullable().optional(),
  bankBranch: z.string().nullable().optional(),
  basicSalary: z.number().default(0),
  currency: z.string().min(1).default("LKR"),
});

export type EmployeeInputData = z.infer<typeof EmployeeInput>;

function toDbEmployee(data: EmployeeInputData) {
  return {
    employeeNumber: data.employeeNumber,
    name: data.name,
    email: data.email ?? null,
    phone: data.phone ?? null,
    department: data.department,
    designation: data.designation,
    joinedDate: data.joinedDate ?? null,
    status: data.status,
    paymentMode: data.paymentMode,
    bankName: data.bankName ?? null,
    bankAccountName: data.bankAccountName ?? null,
    bankAccountNumber: data.bankAccountNumber ?? null,
    bankBranch: data.bankBranch ?? null,
    basicSalary: String(data.basicSalary),
    currency: data.currency,
  };
}

export async function createEmployee(input: EmployeeInputData) {
  const data = EmployeeInput.parse(input);
  const [row] = await db.insert(employees).values(toDbEmployee(data)).returning();
  revalidatePath("/employees");
  return row;
}

export async function updateEmployee(id: string, input: EmployeeInputData) {
  const data = EmployeeInput.parse(input);
  const [row] = await db
    .update(employees)
    .set({ ...toDbEmployee(data), updatedAt: new Date() })
    .where(eq(employees.id, id))
    .returning();
  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  return row;
}

export async function deleteEmployee(id: string) {
  await db.delete(employees).where(eq(employees.id, id));
  revalidatePath("/employees");
}
