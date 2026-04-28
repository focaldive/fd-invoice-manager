import "server-only";
import { Resend } from "resend";
import { generateInvoicePDF } from "@/lib/pdf";
import { formatCurrency } from "@/lib/types";
import type { getInvoiceFull } from "@/server/queries/invoices";

type FullInvoice = NonNullable<Awaited<ReturnType<typeof getInvoiceFull>>>;

export async function sendInvoiceEmail(invoice: FullInvoice) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  const resend = new Resend(apiKey);

  const recipient = invoice.client?.email;
  if (!recipient) {
    throw new Error("Client does not have an email address");
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
  const companyName = invoice.settings?.companyName ?? "FocalDive (Pvt) Ltd";
  const fromEmail = invoice.settings?.companyEmail ?? "devfocaldive@gmail.com";

  const { data, error } = await resend.emails.send({
    from: `${companyName} <${fromEmail}>`,
    to: [recipient],
    subject: `Invoice ${invoice.invoiceNumber} — ${totalFormatted} ${invoice.currency}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Invoice ${invoice.invoiceNumber}</h2>
        <p>Dear ${invoice.client?.name || "Client"},</p>
        <p>Please find attached invoice <strong>${invoice.invoiceNumber}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; color: #666;">Amount</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">${totalFormatted} ${invoice.currency}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Due Date</td>
            <td style="padding: 8px 0; text-align: right;">${dueDate}</td>
          </tr>
        </table>
        <p>If you have any questions, please don't hesitate to reach out.</p>
        <p style="margin-top: 30px;">Best regards,<br/><strong>${companyName}</strong></p>
      </div>
    `,
    attachments: [
      {
        filename: `${invoice.invoiceNumber}.pdf`,
        content: pdfBase64,
        contentType: "application/pdf",
      },
    ],
  });

  if (error) throw new Error(error.message);
  return { messageId: data?.id ?? null, recipient };
}
