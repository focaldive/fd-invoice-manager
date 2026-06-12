"use server";

import { db } from "@/server/db/client";
import {
  payslips,
  payslipItems,
  payslipStatuses,
  payslipItemTypes,
  paymentModes,
  type PayslipStatus,
} from "@/server/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { computeNetPay } from "@/lib/types";
import { nextSlipNumber } from "@/server/payslip-numbering";

export async function generateNextSlipNumber(paymentDate: string) {
  return nextSlipNumber(new Date(paymentDate));
}

export async function getPayslipItemsForPdf(payslipId: string) {
  return db
    .select()
    .from(payslipItems)
    .where(eq(payslipItems.payslipId, payslipId))
    .orderBy(asc(payslipItems.sortOrder));
}

const PayslipItemInput = z.object({
  description: z.string().min(1),
  type: z.enum(payslipItemTypes).default("earning"),
  amount: z.number(),
  sortOrder: z.number().int().nonnegative(),
});

const PayslipInput = z.object({
  slipNumber: z.string().min(1),
  employeeId: z.string().uuid(),
  payPeriodMonth: z.number().int().min(1).max(12),
  payPeriodYear: z.number().int(),
  paymentDate: z.string(),
  paymentMode: z.enum(paymentModes).default("bank_transfer"),
  status: z.enum(payslipStatuses).default("draft"),
  currency: z.string().min(1).default("LKR"),
  notes: z.string().nullable().optional(),
  authorizedByName: z.string().nullable().optional(),
  authorizedByTitle: z.string().nullable().optional(),
});

export type PayslipInputData = z.infer<typeof PayslipInput>;
export type PayslipItemInputData = z.infer<typeof PayslipItemInput>;

function toDbPayslip(
  data: PayslipInputData,
  totals: { grossPay: number; totalDeductions: number; netPay: number },
) {
  return {
    slipNumber: data.slipNumber,
    employeeId: data.employeeId,
    payPeriodMonth: data.payPeriodMonth,
    payPeriodYear: data.payPeriodYear,
    paymentDate: data.paymentDate,
    paymentMode: data.paymentMode,
    status: data.status,
    currency: data.currency,
    grossPay: String(totals.grossPay),
    totalDeductions: String(totals.totalDeductions),
    netPay: String(totals.netPay),
    notes: data.notes ?? null,
    authorizedByName: data.authorizedByName ?? null,
    authorizedByTitle: data.authorizedByTitle ?? null,
  };
}

function toDbItems(payslipId: string, items: PayslipItemInputData[]) {
  return items.map((item, idx) => ({
    payslipId,
    description: item.description,
    type: item.type,
    amount: String(item.amount),
    sortOrder: item.sortOrder ?? idx,
  }));
}

export async function createPayslip(
  input: PayslipInputData,
  items: PayslipItemInputData[],
) {
  const payslip = PayslipInput.parse(input);
  const parsedItems = z.array(PayslipItemInput).parse(items);
  const totals = computeNetPay(parsedItems);

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(payslips)
      .values(toDbPayslip(payslip, totals))
      .returning();
    if (parsedItems.length > 0) {
      await tx.insert(payslipItems).values(toDbItems(row.id, parsedItems));
    }
    revalidatePath("/payslips");
    return row;
  });
}

export async function updatePayslip(
  id: string,
  input: PayslipInputData,
  items: PayslipItemInputData[],
) {
  const payslip = PayslipInput.parse(input);
  const parsedItems = z.array(PayslipItemInput).parse(items);
  const totals = computeNetPay(parsedItems);

  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(payslips)
      .set({ ...toDbPayslip(payslip, totals), updatedAt: new Date() })
      .where(eq(payslips.id, id))
      .returning();

    await tx.delete(payslipItems).where(eq(payslipItems.payslipId, id));
    if (parsedItems.length > 0) {
      await tx.insert(payslipItems).values(toDbItems(id, parsedItems));
    }

    revalidatePath("/payslips");
    revalidatePath(`/payslips/${id}`);
    return row;
  });
}

export async function setPayslipStatus(id: string, status: PayslipStatus) {
  z.enum(payslipStatuses).parse(status);
  await db
    .update(payslips)
    .set({ status, updatedAt: new Date() })
    .where(eq(payslips.id, id));

  revalidatePath("/payslips");
  revalidatePath(`/payslips/${id}`);
}

export async function deletePayslip(id: string) {
  await db.delete(payslips).where(eq(payslips.id, id));
  revalidatePath("/payslips");
}
