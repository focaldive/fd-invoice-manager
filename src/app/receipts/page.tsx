import { AppShell } from "@/components/app-shell";
import { ReceiptsTable } from "@/components/receipts/receipts-table";
import { listReceipts } from "@/server/queries/invoices";
import { getSettings } from "@/server/queries/settings";

export default async function ReceiptsPage() {
  const [receipts, settings] = await Promise.all([listReceipts(), getSettings()]);
  return (
    <AppShell>
      <ReceiptsTable receipts={receipts} settings={settings} />
    </AppShell>
  );
}
