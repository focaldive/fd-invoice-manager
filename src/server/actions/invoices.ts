"use server";

import { db } from "@/server/db/client";
import {
  invoices,
  invoiceItems,
  invoiceStatuses,
  type InvoiceStatus,
} from "@/server/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  nextDuplicateInvoiceNumber,
  nextInvoiceNumber,
} from "@/server/invoice-numbering";

export async function generateNextInvoiceNumber(clientName: string, issueDate: string) {
  return nextInvoiceNumber(clientName, new Date(issueDate));
}

export async function getInvoiceItemsForPdf(invoiceId: string) {
  return db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId))
    .orderBy(asc(invoiceItems.sortOrder));
}

const InvoiceItemInput = z.object({
  description: z.string().min(1),
  quantity: z.number(),
  unitPrice: z.number(),
  sortOrder: z.number().int().nonnegative(),
});

const InvoiceInput = z.object({
  invoiceNumber: z.string().min(1),
  clientId: z.string().uuid(),
  dateOfIssue: z.string(),
  dateDue: z.string(),
  status: z.enum(invoiceStatuses),
  subtotal: z.number(),
  taxPercentage: z.number(),
  taxAmount: z.number(),
  discountPercentage: z.number(),
  discountAmount: z.number(),
  total: z.number(),
  currency: z.string().min(1),
  notes: z.string().nullable().optional(),
  category: z.string().min(1),
});

export type InvoiceInputData = z.infer<typeof InvoiceInput>;
export type InvoiceItemInputData = z.infer<typeof InvoiceItemInput>;

function toDbInvoice(data: InvoiceInputData) {
  return {
    invoiceNumber: data.invoiceNumber,
    clientId: data.clientId,
    dateOfIssue: data.dateOfIssue,
    dateDue: data.dateDue,
    status: data.status,
    subtotal: String(data.subtotal),
    taxPercentage: String(data.taxPercentage),
    taxAmount: String(data.taxAmount),
    discountPercentage: String(data.discountPercentage),
    discountAmount: String(data.discountAmount),
    total: String(data.total),
    currency: data.currency,
    notes: data.notes ?? null,
    category: data.category,
  };
}

function toDbItems(invoiceId: string, items: InvoiceItemInputData[]) {
  return items.map((item, idx) => ({
    invoiceId,
    description: item.description,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    amount: String(Number(item.quantity) * Number(item.unitPrice)),
    sortOrder: item.sortOrder ?? idx,
  }));
}

export async function createInvoice(
  input: InvoiceInputData,
  items: InvoiceItemInputData[],
) {
  const invoice = InvoiceInput.parse(input);
  const parsedItems = z.array(InvoiceItemInput).parse(items);

  return db.transaction(async (tx) => {
    const [row] = await tx.insert(invoices).values(toDbInvoice(invoice)).returning();
    if (parsedItems.length > 0) {
      await tx.insert(invoiceItems).values(toDbItems(row.id, parsedItems));
    }
    revalidatePath("/invoices");
    revalidatePath("/");
    return row;
  });
}

export async function updateInvoice(
  id: string,
  input: InvoiceInputData,
  items: InvoiceItemInputData[],
) {
  const invoice = InvoiceInput.parse(input);
  const parsedItems = z.array(InvoiceItemInput).parse(items);

  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(invoices)
      .set({ ...toDbInvoice(invoice), updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();

    await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    if (parsedItems.length > 0) {
      await tx.insert(invoiceItems).values(toDbItems(id, parsedItems));
    }

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    revalidatePath("/");
    return row;
  });
}

export async function setInvoiceStatus(id: string, status: InvoiceStatus) {
  z.enum(invoiceStatuses).parse(status);
  await db
    .update(invoices)
    .set({ status, updatedAt: new Date() })
    .where(eq(invoices.id, id));

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/");
}

export async function duplicateInvoice(sourceId: string) {
  const source = await db.query.invoices.findFirst({
    where: (i, { eq }) => eq(i.id, sourceId),
    with: { items: { orderBy: (it, { asc }) => asc(it.sortOrder) } },
  });
  if (!source) throw new Error("Source invoice not found");

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const due = new Date(today.getTime() + 14 * 86400000).toISOString().split("T")[0];
  const newNumber = await nextDuplicateInvoiceNumber(today.getFullYear());

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(invoices)
      .values({
        invoiceNumber: newNumber,
        clientId: source.clientId,
        dateOfIssue: todayStr,
        dateDue: due,
        status: "draft",
        subtotal: source.subtotal,
        taxPercentage: source.taxPercentage,
        taxAmount: source.taxAmount,
        discountPercentage: source.discountPercentage,
        discountAmount: source.discountAmount,
        total: source.total,
        currency: source.currency,
        notes: source.notes,
        category: source.category,
      })
      .returning();

    if (source.items.length > 0) {
      await tx.insert(invoiceItems).values(
        source.items.map((item) => ({
          invoiceId: row.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          sortOrder: item.sortOrder,
        })),
      );
    }

    revalidatePath("/invoices");
    return row;
  });
}

export async function linkRecurringTemplate(invoiceId: string, templateId: string) {
  await db
    .update(invoices)
    .set({
      recurringInvoiceId: templateId,
      isAutoGenerated: false,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));

  revalidatePath(`/invoices/${invoiceId}`);
}
