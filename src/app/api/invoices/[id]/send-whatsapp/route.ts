import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { invoices } from "@/server/db/schema";
import { getInvoiceFull } from "@/server/queries/invoices";
import { logDelivery } from "@/server/queries/delivery-logs";
import { sendInvoiceWhatsApp } from "@/server/integrations/whapi";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const invoice = await getInvoiceFull(id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  try {
    const { messageId, recipient } = await sendInvoiceWhatsApp(invoice);

    await logDelivery({
      invoiceId: id,
      channel: "whatsapp",
      recipient,
      status: "sent",
      externalMessageId: messageId,
    });

    await db
      .update(invoices)
      .set({
        sentOnWhatsapp: true,
        status: invoice.status === "draft" ? "sent" : invoice.status,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id));

    return NextResponse.json({ success: true, messageId, recipient });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await logDelivery({
      invoiceId: id,
      channel: "whatsapp",
      recipient: invoice.client?.phone ?? "",
      status: "failed",
      errorMessage: message,
    });
    return NextResponse.json(
      { error: "Failed to send WhatsApp message", details: message },
      { status: 502 },
    );
  }
}
