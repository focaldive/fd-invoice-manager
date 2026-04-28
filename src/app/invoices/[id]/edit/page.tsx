import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { getInvoiceFull } from "@/server/queries/invoices";
import { listClients } from "@/server/queries/clients";
import { getSettings } from "@/server/queries/settings";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoice, clients, settings] = await Promise.all([
    getInvoiceFull(id),
    listClients(),
    getSettings(),
  ]);

  if (!invoice) notFound();

  return (
    <AppShell>
      <InvoiceForm clients={clients} settings={settings} invoice={invoice} />
    </AppShell>
  );
}
