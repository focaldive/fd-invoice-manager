import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getInvoiceFull } from "@/server/queries/invoices";
import { listDeliveryLogs } from "@/server/queries/delivery-logs";
import { InvoiceDetail } from "@/components/invoices/invoice-detail";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [invoice, deliveryLogs] = await Promise.all([
    getInvoiceFull(id),
    listDeliveryLogs(id),
  ]);

  if (!invoice) notFound();

  return (
    <AppShell>
      <InvoiceDetail invoice={invoice} deliveryLogs={deliveryLogs} />
    </AppShell>
  );
}
