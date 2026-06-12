import { AppShell } from "@/components/app-shell";
import { listEmployees } from "@/server/queries/employees";
import { EmployeesTable } from "@/components/employees/employees-table";

export default async function EmployeesPage() {
  const employees = await listEmployees();
  return (
    <AppShell>
      <EmployeesTable employees={employees} />
    </AppShell>
  );
}
