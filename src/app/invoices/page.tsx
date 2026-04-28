import { AppShell } from "@/components/app-shell";
import { listInvoices } from "@/server/queries/invoices";
import { getSettings } from "@/server/queries/settings";
import { InvoicesTable } from "@/components/invoices/invoices-table";

export default async function InvoicesPage() {
  const [invoices, settings] = await Promise.all([listInvoices(), getSettings()]);
  return (
    <AppShell>
      <InvoicesTable invoices={invoices} settings={settings} />
    </AppShell>
  );
}
