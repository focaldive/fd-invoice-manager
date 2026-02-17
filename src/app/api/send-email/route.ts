import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { generateInvoicePDF } from "@/lib/pdf";
import { formatCurrency } from "@/lib/types";
import type { Invoice, InvoiceItem, Settings } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    // 1. Fetch invoice with client and items
    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .select("*, client:clients(*)")
      .eq("id", invoiceId)
      .single();

    if (invError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const { data: items } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("sort_order");

    const { data: settings } = await supabase
      .from("settings")
      .select("*")
      .limit(1)
      .single();

    // 2. Validate client email
    const clientEmail = invoice.client?.email;
    if (!clientEmail) {
      return NextResponse.json(
        { error: "Client does not have an email address" },
        { status: 400 },
      );
    }

    // 3. Generate PDF as base64
    const fullInvoice = { ...invoice, items: items || [] } as Invoice & {
      items: InvoiceItem[];
      client?: any;
    };
    const pdfBase64 = (await generateInvoicePDF(
      fullInvoice,
      settings as Settings | null,
      "base64",
    )) as string;

    // 4. Send email via Resend
    const dueDate = new Date(invoice.date_due).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const totalFormatted = formatCurrency(Number(invoice.total), invoice.currency);
    const companyName = settings?.company_name || "FocalDive (Pvt) Ltd";
    const fromEmail = settings?.company_email || "devfocaldive@gmail.com";

    const { data: sendData, error: sendError } = await resend.emails.send({
      from: `${companyName} <${fromEmail}>`,
      to: [clientEmail],
      subject: `Invoice ${invoice.invoice_number} — ${totalFormatted} ${invoice.currency}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Invoice ${invoice.invoice_number}</h2>
          <p>Dear ${invoice.client?.name || "Client"},</p>
          <p>Please find attached invoice <strong>${invoice.invoice_number}</strong>.</p>
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
          filename: `${invoice.invoice_number}.pdf`,
          content: pdfBase64,
          contentType: "application/pdf",
        },
      ],
    });

    if (sendError) {
      console.error("Resend send failed:", sendError);

      await logDelivery(invoiceId, clientEmail, "failed", null, sendError.message);

      return NextResponse.json(
        { error: "Failed to send email", details: sendError.message },
        { status: 502 },
      );
    }

    const messageId = sendData?.id || null;

    // 5. Log successful delivery
    await logDelivery(invoiceId, clientEmail, "sent", messageId);

    // 6. Update invoice: mark as sent on email, and update status if draft
    const updateData: Record<string, any> = {
      sent_on_email: true,
      updated_at: new Date().toISOString(),
    };
    if (invoice.status === "draft") {
      updateData.status = "sent";
    }
    await supabase.from("invoices").update(updateData).eq("id", invoiceId);

    return NextResponse.json({
      success: true,
      messageId,
      recipient: clientEmail,
    });
  } catch (err: any) {
    console.error("Email send error:", err);
    return NextResponse.json(
      { error: "Internal server error", message: err.message },
      { status: 500 },
    );
  }
}

async function logDelivery(
  invoiceId: string,
  recipient: string,
  status: string,
  externalMessageId: string | null,
  errorMessage?: string,
) {
  try {
    await supabase.from("invoice_delivery_log").insert({
      invoice_id: invoiceId,
      channel: "email",
      recipient,
      status,
      external_message_id: externalMessageId,
      error_message: errorMessage || null,
    });
  } catch {
    console.warn("Failed to log delivery — invoice_delivery_log table may not exist");
  }
}
