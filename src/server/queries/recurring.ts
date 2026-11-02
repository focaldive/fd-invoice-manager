import "server-only";
import { db } from "@/server/db/client";

export async function listRecurringTemplates() {
  return db.query.recurringInvoices.findMany({
    with: { client: true, items: { orderBy: (it, { asc }) => asc(it.sortOrder) } },
    orderBy: (r, { desc }) => desc(r.createdAt),
  });
}

export async function listRecurringPayslipTemplates() {
  return db.query.recurringPayslips.findMany({
    with: { employee: true, items: { orderBy: (it, { asc }) => asc(it.sortOrder) } },
    orderBy: (r, { desc }) => desc(r.createdAt),
  });
}
