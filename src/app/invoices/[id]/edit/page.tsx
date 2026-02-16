"use client"

import { AppShell } from "@/components/app-shell"
import { InvoiceForm } from "@/components/invoice-form"
import { useParams } from "next/navigation"

export default function EditInvoicePage() {
  const params = useParams()
  return (
    <AppShell>
      <InvoiceForm invoiceId={params.id as string} />
    </AppShell>
  )
}
