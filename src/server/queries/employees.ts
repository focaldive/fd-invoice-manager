import "server-only";
import { db } from "@/server/db/client";
import { employees } from "@/server/db/schema";
import { asc, eq } from "drizzle-orm";

export async function listEmployees() {
  return db.select().from(employees).orderBy(asc(employees.name));
}

export async function getEmployee(id: string) {
  const [row] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, id))
    .limit(1);
  return row ?? null;
}

export async function getEmployeeWithPayslips(id: string) {
  return db.query.employees.findFirst({
    where: (e, { eq }) => eq(e.id, id),
    with: {
      payslips: {
        orderBy: (p, { desc }) => desc(p.paymentDate),
      },
    },
  });
}
