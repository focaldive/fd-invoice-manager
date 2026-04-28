import { AppShell } from "@/components/app-shell";
import { listRecurringTemplates } from "@/server/queries/recurring";
import { RecurringTable } from "@/components/recurring/recurring-table";

export default async function RecurringPage() {
  const templates = await listRecurringTemplates();
  return (
    <AppShell>
      <RecurringTable templates={templates} />
    </AppShell>
  );
}
