import "server-only";
import { db } from "@/server/db/client";
import { invoices, invoiceItems, payments, settings } from "@/server/db/schema";
import { and, desc, eq } from "drizzle-orm";

export async function listInvoices() {
  return db.query.invoices.findMany({
    // payments: needed so receipts can show the actual paid date
    with: { client: true, payments: true },
    orderBy: (i, { desc }) => desc(i.createdAt),
  });
}

/** Paid invoices — each one is a receipt. Payments included for paid date/method. */
export async function listReceipts() {
  return db.query.invoices.findMany({
    where: (i, { eq }) => eq(i.status, "paid"),
    with: {
      client: true,
      payments: { orderBy: (p, { desc }) => desc(p.paymentDate) },
    },
    orderBy: (i, { desc }) => desc(i.updatedAt),
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

/** Public share-link lookup. Returns null for unknown/revoked tokens. */
export async function getInvoiceByShareToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const invoice = await db.query.invoices.findFirst({
    where: (i, { eq }) => eq(i.shareToken, token),
    columns: { id: true },
  });
  return invoice ? getInvoiceFull(invoice.id) : null;
}
