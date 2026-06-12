import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PayslipForm } from "@/components/payslips/payslip-form";
import { getPayslipFull } from "@/server/queries/payslips";
import { listEmployees } from "@/server/queries/employees";
import { getSettings } from "@/server/queries/settings";

export default async function EditPayslipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [payslip, employees, settings] = await Promise.all([
    getPayslipFull(id),
    listEmployees(),
    getSettings(),
  ]);

  if (!payslip) notFound();

  return (
    <AppShell>
      <PayslipForm employees={employees} settings={settings} payslip={payslip} />
    </AppShell>
  );
}
