import "server-only";
import { db } from "@/server/db/client";
import { employees, payslips } from "@/server/db/schema";
import { desc, like } from "drizzle-orm";
import {
  buildEmployeeNumber,
  buildSlipNumber,
  getDepartmentAbbreviation,
} from "@/lib/types";

/**
 * Next employee number for a department: FD-{DEPT}-{YY}-{SEQ}.
 * Sequence increments per department per joining year.
 */
export async function nextEmployeeNumber(department: string, joinedDate: Date) {
  const abbr = getDepartmentAbbreviation(department);
  const yy = String(joinedDate.getFullYear()).slice(2);
  const prefix = `FD-${abbr}-${yy}-`;

  const [last] = await db
    .select({ n: employees.employeeNumber })
    .from(employees)
    .where(like(employees.employeeNumber, `${prefix}%`))
    .orderBy(desc(employees.employeeNumber))
    .limit(1);

  let nextSeq = 1;
  if (last) {
    const parts = last.n.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return buildEmployeeNumber(abbr, yy, nextSeq);
}

/**
 * Next slip number for a payment date: FD-{DDMMYY}-{SEQ}.
 * Sequence increments across all payslips paid on the same date.
 */
export async function nextSlipNumber(paymentDate: Date) {
  const dd = String(paymentDate.getDate()).padStart(2, "0");
  const mm = String(paymentDate.getMonth() + 1).padStart(2, "0");
  const yy = String(paymentDate.getFullYear()).slice(2);
  const ddmmyy = `${dd}${mm}${yy}`;
  const prefix = `FD-${ddmmyy}-`;

  const [last] = await db
    .select({ n: payslips.slipNumber })
    .from(payslips)
    .where(like(payslips.slipNumber, `${prefix}%`))
    .orderBy(desc(payslips.slipNumber))
    .limit(1);

  let nextSeq = 1;
  if (last) {
    const parts = last.n.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return buildSlipNumber(ddmmyy, nextSeq);
}
