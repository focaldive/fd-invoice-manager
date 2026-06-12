import { AppShell } from "@/components/app-shell";
import { PayslipForm } from "@/components/payslips/payslip-form";
import { listEmployees } from "@/server/queries/employees";
import { getSettings } from "@/server/queries/settings";

export default async function NewPayslipPage() {
  const [employees, settings] = await Promise.all([listEmployees(), getSettings()]);
  return (
    <AppShell>
      <PayslipForm employees={employees} settings={settings} />
    </AppShell>
  );
}
