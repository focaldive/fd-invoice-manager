import "server-only";
import { db } from "@/server/db/client";
import { payslips, settings } from "@/server/db/schema";
import { desc, eq } from "drizzle-orm";

export async function listPayslips() {
  return db.query.payslips.findMany({
    with: { employee: true },
    orderBy: (p, { desc }) => desc(p.createdAt),
  });
}

export async function listPayslipsByEmployee(employeeId: string) {
  return db
    .select()
    .from(payslips)
    .where(eq(payslips.employeeId, employeeId))
    .orderBy(desc(payslips.paymentDate));
}

export async function getPayslipFull(id: string) {
  const payslip = await db.query.payslips.findFirst({
    where: (p, { eq }) => eq(p.id, id),
    with: {
      employee: true,
      items: { orderBy: (it, { asc }) => asc(it.sortOrder) },
    },
  });

  if (!payslip) return null;

  const [settingsRow] = await db.select().from(settings).limit(1);
  return { ...payslip, settings: settingsRow ?? null };
}

export async function getPayslipForDelivery(id: string) {
  return getPayslipFull(id);
}
