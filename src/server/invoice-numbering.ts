import "server-only";
import { db } from "@/server/db/client";
import { invoices } from "@/server/db/schema";
import { desc, like } from "drizzle-orm";
import { buildInvoiceNumber, getClientAbbreviation } from "@/lib/types";

/** `db` or a transaction handle — lets callers number inside their own tx. */
export type QueryExecutor = Pick<typeof db, "select">;

export async function nextInvoiceNumber(
  clientName: string,
  issueDate: Date,
  exec: QueryExecutor = db,
) {
  const abbr = getClientAbbreviation(clientName);
  const yy = String(issueDate.getFullYear()).slice(2);
  const mm = String(issueDate.getMonth() + 1).padStart(2, "0");
  const yearMonth = `${yy}${mm}`;
  const prefix = `FD-${abbr}-${yearMonth}-`;

  const [last] = await exec
    .select({ n: invoices.invoiceNumber })
    .from(invoices)
    .where(like(invoices.invoiceNumber, `${prefix}%`))
    .orderBy(desc(invoices.invoiceNumber))
    .limit(1);

  let nextSeq = 1;
  if (last) {
    const parts = last.n.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return buildInvoiceNumber(abbr, yearMonth, nextSeq);
}

export async function nextDuplicateInvoiceNumber(year: number) {
  const prefix = `FD-INV-${year}-`;

  const [last] = await db
    .select({ n: invoices.invoiceNumber })
    .from(invoices)
    .where(like(invoices.invoiceNumber, `${prefix}%`))
    .orderBy(desc(invoices.invoiceNumber))
    .limit(1);

  let nextSeq = 1;
  if (last) {
    const parts = last.n.split("-");
    const lastSeq = parseInt(parts[3], 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}
