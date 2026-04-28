import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { invoices } from "@/server/db/schema";
import { getInvoiceFull } from "@/server/queries/invoices";
import { logDelivery } from "@/server/queries/delivery-logs";
import { sendInvoiceEmail } from "@/server/integrations/resend";

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
    const { messageId, recipient } = await sendInvoiceEmail(invoice);

    await logDelivery({
      invoiceId: id,
      channel: "email",
      recipient,
      status: "sent",
      externalMessageId: messageId,
    });

    await db
      .update(invoices)
      .set({
        sentOnEmail: true,
        status: invoice.status === "draft" ? "sent" : invoice.status,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id));

    return NextResponse.json({ success: true, messageId, recipient });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await logDelivery({
      invoiceId: id,
      channel: "email",
      recipient: invoice.client?.email ?? "",
      status: "failed",
      errorMessage: message,
    });
    return NextResponse.json(
      { error: "Failed to send email", details: message },
      { status: 502 },
    );
  }
}
