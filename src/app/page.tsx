import { AppShell } from "@/components/app-shell";
import { getDashboardInvoices } from "@/server/queries/invoices";
import { getLedgerSyncInfo, listLedgerEntries } from "@/server/queries/ledger";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { CashFlowSection } from "@/components/ledger/cash-flow-section";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const currency = sp.currency ?? "LKR";
  const category = sp.category ?? "all";

  const [invoices, ledger, ledgerSync] = await Promise.all([
    getDashboardInvoices(currency, category),
    listLedgerEntries(),
    getLedgerSyncInfo(),
  ]);

  return (
    <AppShell>
      <div className="space-y-12">
        <DashboardView invoices={invoices} currency={currency} category={category} />
        <CashFlowSection entries={ledger} sync={ledgerSync} />
      </div>
    </AppShell>
  );
}
