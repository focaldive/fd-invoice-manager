import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getPayslipFull } from "@/server/queries/payslips";
import { PayslipDetail } from "@/components/payslips/payslip-detail";

export default async function PayslipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const payslip = await getPayslipFull(id);

  if (!payslip) notFound();

  return (
    <AppShell>
      <PayslipDetail payslip={payslip} />
    </AppShell>
  );
}
