import { AppShell } from "@/components/app-shell";
import {
  listRecurringTemplates,
  listRecurringPayslipTemplates,
} from "@/server/queries/recurring";
import { RecurringTable } from "@/components/recurring/recurring-table";

export default async function RecurringPage() {
  const [templates, payslipTemplates] = await Promise.all([
    listRecurringTemplates(),
    listRecurringPayslipTemplates(),
  ]);
  return (
    <AppShell>
      <RecurringTable templates={templates} payslipTemplates={payslipTemplates} />
    </AppShell>
  );
}
