import { AppShell } from "@/components/app-shell";
import { listClients } from "@/server/queries/clients";
import { ClientsTable } from "@/components/clients/clients-table";

export default async function ClientsPage() {
  const clients = await listClients();
  return (
    <AppShell>
      <ClientsTable clients={clients} />
    </AppShell>
  );
}
