import "server-only";
import { db } from "@/server/db/client";
import { clients } from "@/server/db/schema";
import { asc, eq } from "drizzle-orm";

export async function listClients() {
  return db.select().from(clients).orderBy(asc(clients.name));
}

export async function getClient(id: string) {
  const [row] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return row ?? null;
}

export async function getClientWithInvoices(id: string) {
  return db.query.clients.findFirst({
    where: (c, { eq }) => eq(c.id, id),
    with: {
      invoices: {
        orderBy: (i, { desc }) => desc(i.dateOfIssue),
      },
    },
  });
}
