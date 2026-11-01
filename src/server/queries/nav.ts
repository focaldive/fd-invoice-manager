import { db } from "@/server/db/client";
import { clients, invoices } from "@/server/db/schema";
import { sql } from "drizzle-orm";

export type NavCounts = {
  invoices: number;
  unpaid: number;
  receipts: number;
  clients: number;
};

/** Badge counts for the sidebar. Two cheap aggregate queries. */
export async function getNavCounts(): Promise<NavCounts> {
  const [[inv], [cli]] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        unpaid: sql<number>`count(*) filter (where ${invoices.status} in ('sent', 'overdue'))::int`,
        paid: sql<number>`count(*) filter (where ${invoices.status} = 'paid')::int`,
      })
      .from(invoices),
    db.select({ total: sql<number>`count(*)::int` }).from(clients),
  ]);

  return {
    invoices: inv?.total ?? 0,
    unpaid: inv?.unpaid ?? 0,
    receipts: inv?.paid ?? 0,
    clients: cli?.total ?? 0,
  };
}
