import { AppShell } from "@/components/app-shell";
import { getDashboardInvoices } from "@/server/queries/invoices";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const currency = sp.currency ?? "LKR";
  const category = sp.category ?? "all";

  const invoices = await getDashboardInvoices(currency, category);

  return (
    <AppShell>
      <DashboardView invoices={invoices} currency={currency} category={category} />
    </AppShell>
  );
}
