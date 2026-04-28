import "server-only";
import { generateInvoicePDF } from "@/lib/pdf";
import { normalizePhoneForWhatsApp, isValidWhatsAppNumber } from "@/lib/phone";
import { formatCurrency } from "@/lib/types";
import type { getInvoiceFull } from "@/server/queries/invoices";

type FullInvoice = NonNullable<Awaited<ReturnType<typeof getInvoiceFull>>>;

const WHAPI_API_URL = "https://gate.whapi.cloud";

export async function sendInvoiceWhatsApp(invoice: FullInvoice) {
  const token = process.env.WHAPI_API_TOKEN;
  if (!token) throw new Error("WHAPI_API_TOKEN is not configured");

  const rawPhone = invoice.client?.phone;
  if (!rawPhone) {
    throw new Error("Client does not have a phone number");
  }

  const normalized = normalizePhoneForWhatsApp(rawPhone);
  if (!isValidWhatsAppNumber(normalized)) {
    throw new Error(`Invalid phone number: ${rawPhone}`);
  }

  const pdfBase64 = (await generateInvoicePDF(
    { ...invoice, items: invoice.items, client: invoice.client ?? undefined },
    invoice.settings,
    "base64",
  )) as string;

  const totalFormatted = formatCurrency(Number(invoice.total), invoice.currency);
  const dueDate = new Date(invoice.dateDue).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const caption = `Invoice ${invoice.invoiceNumber}\nAmount: ${totalFormatted} ${invoice.currency}\nDue: ${dueDate}\n\nFrom FocalDive (Pvt) Ltd`;

  const res = await fetch(`${WHAPI_API_URL}/messages/document`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: normalized,
      media: `data:application/pdf;base64,${pdfBase64}`,
      filename: `${invoice.invoiceNumber}.pdf`,
      caption,
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(JSON.stringify(json));
  }

  return {
    messageId: json.message?.id ?? json.id ?? null,
    recipient: normalized,
  };
}
