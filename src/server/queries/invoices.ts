import "server-only";
import { db } from "@/server/db/client";
import { invoices, invoiceItems, payments, settings } from "@/server/db/schema";
import { and, desc, eq } from "drizzle-orm";

export async function listInvoices() {
  return db.query.invoices.findMany({
    with: { client: true },
    orderBy: (i, { desc }) => desc(i.createdAt),
  });
}

export async function listInvoicesByClient(clientId: string) {
  return db
    .select()
    .from(invoices)
    .where(eq(invoices.clientId, clientId))
    .orderBy(desc(invoices.dateOfIssue));
}

export async function getInvoiceFull(id: string) {
  const invoice = await db.query.invoices.findFirst({
    where: (i, { eq }) => eq(i.id, id),
    with: {
      client: true,
      items: { orderBy: (it, { asc }) => asc(it.sortOrder) },
      payments: { orderBy: (p, { desc }) => desc(p.paymentDate) },
    },
  });

  if (!invoice) return null;

  const [settingsRow] = await db.select().from(settings).limit(1);
  return { ...invoice, settings: settingsRow ?? null };
}

export async function getInvoiceForDelivery(id: string) {
  return getInvoiceFull(id);
}

export async function getDashboardInvoices(currency: string, category?: string) {
  const conditions = [eq(invoices.currency, currency)];
  if (category && category !== "all") {
    conditions.push(eq(invoices.category, category));
  }

  return db.query.invoices.findMany({
    where: and(...conditions),
    with: { client: true },
    orderBy: (i, { desc }) => desc(i.createdAt),
  });
}
