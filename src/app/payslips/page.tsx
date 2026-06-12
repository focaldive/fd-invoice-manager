import { AppShell } from "@/components/app-shell";
import { listPayslips } from "@/server/queries/payslips";
import { getSettings } from "@/server/queries/settings";
import { PayslipsTable } from "@/components/payslips/payslips-table";

export default async function PayslipsPage() {
  const [payslips, settings] = await Promise.all([listPayslips(), getSettings()]);
  return (
    <AppShell>
      <PayslipsTable payslips={payslips} settings={settings} />
    </AppShell>
  );
}
