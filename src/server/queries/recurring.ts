import "server-only";
import { db } from "@/server/db/client";

export async function listRecurringTemplates() {
  return db.query.recurringInvoices.findMany({
    with: { client: true },
    orderBy: (r, { desc }) => desc(r.createdAt),
  });
}

export async function getRecurringTemplate(id: string) {
  return db.query.recurringInvoices.findFirst({
    where: (r, { eq }) => eq(r.id, id),
    with: {
      client: true,
      items: { orderBy: (it, { asc }) => asc(it.sortOrder) },
    },
  });
}
