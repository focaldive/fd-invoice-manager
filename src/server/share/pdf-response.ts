import "server-only";
import { generateInvoicePDF, type PDFVariant } from "@/lib/pdf";
import { getReceiptNumber } from "@/lib/types";
import { getInvoiceByShareToken } from "@/server/queries/invoices";

const notFound = () => new Response("Not found", { status: 404 });

/** Renders the shared invoice (or its receipt) as an inline PDF. */
export async function sharedPdfResponse(token: string, variant: PDFVariant) {
  const invoice = await getInvoiceByShareToken(token);
  if (!invoice) return notFound();
  if (variant === "receipt" && invoice.status !== "paid") return notFound();

  const pdf = (await generateInvoicePDF(
    { ...invoice, client: invoice.client ?? undefined },
    invoice.settings,
    "arraybuffer",
    variant,
  )) as ArrayBuffer;

  const name =
    variant === "receipt" ? getReceiptNumber(invoice.invoiceNumber) : invoice.invoiceNumber;

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${name}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}
