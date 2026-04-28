import { AppShell } from "@/components/app-shell";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { listClients } from "@/server/queries/clients";
import { getSettings } from "@/server/queries/settings";

export default async function NewInvoicePage() {
  const [clients, settings] = await Promise.all([listClients(), getSettings()]);
  return (
    <AppShell>
      <InvoiceForm clients={clients} settings={settings} />
    </AppShell>
  );
}
