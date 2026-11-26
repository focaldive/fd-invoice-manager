import { AppShell } from "@/components/app-shell";
import { AccountsView } from "@/components/ledger/accounts-view";
import { getLedgerSyncInfo, listLedgerEntries } from "@/server/queries/ledger";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const [entries, sync] = await Promise.all([listLedgerEntries(), getLedgerSyncInfo()]);
  const sheetId = process.env.LEDGER_SHEET_ID;
  const sheetUrl = sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : null;
  return (
    <AppShell>
      <AccountsView entries={entries} sync={sync} sheetUrl={sheetUrl} />
    </AppShell>
  );
}
