"use server";

import { db } from "@/server/db/client";
import { invoices, payments, paymentMethods } from "@/server/db/schema";
import { eq, sum } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const PaymentInput = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  paymentDate: z.string(),
  paymentMethod: z.enum(paymentMethods),
  reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type PaymentInputData = z.infer<typeof PaymentInput>;

export async function recordPayment(input: PaymentInputData) {
  const data = PaymentInput.parse(input);

  return db.transaction(async (tx) => {
    const [payment] = await tx
      .insert(payments)
      .values({
        invoiceId: data.invoiceId,
        amount: String(data.amount),
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        reference: data.reference ?? null,
        notes: data.notes ?? null,
      })
      .returning();

    const [invoice] = await tx
      .select({ total: invoices.total, status: invoices.status })
      .from(invoices)
      .where(eq(invoices.id, data.invoiceId));

    const [paidAgg] = await tx
      .select({ paid: sum(payments.amount).mapWith(Number) })
      .from(payments)
      .where(eq(payments.invoiceId, data.invoiceId));

    const totalPaid = paidAgg?.paid ?? 0;
    if (invoice && totalPaid >= Number(invoice.total) && invoice.status !== "paid") {
      await tx
        .update(invoices)
        .set({ status: "paid", updatedAt: new Date() })
        .where(eq(invoices.id, data.invoiceId));
    }

    revalidatePath(`/invoices/${data.invoiceId}`);
    revalidatePath("/invoices");
    revalidatePath("/");
    return payment;
  });
}
