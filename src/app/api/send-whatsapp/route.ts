import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateInvoicePDF } from "@/lib/pdf";
import { normalizePhoneForWhatsApp, isValidWhatsAppNumber } from "@/lib/phone";
import { formatCurrency } from "@/lib/types";
import type { Invoice, InvoiceItem, Settings } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const WHAPI_API_URL = "https://gate.whapi.cloud";
const WHAPI_TOKEN = process.env.WHAPI_API_TOKEN!;

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

    // 2. Validate client phone number
    const clientPhone = invoice.client?.phone;
    if (!clientPhone) {
      return NextResponse.json(
        { error: "Client does not have a phone number" },
        { status: 400 },
      );
    }

    const normalizedPhone = normalizePhoneForWhatsApp(clientPhone);
    if (!isValidWhatsAppNumber(normalizedPhone)) {
      return NextResponse.json(
        { error: `Invalid phone number: ${clientPhone}` },
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

    // 4. Send document via Whapi.cloud
    const dueDate = new Date(invoice.date_due).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const totalFormatted = formatCurrency(Number(invoice.total), invoice.currency);

    const caption = `Invoice ${invoice.invoice_number}\nAmount: ${totalFormatted} ${invoice.currency}\nDue: ${dueDate}\n\nFrom FocalDive (Pvt) Ltd`;

    const sendRes = await fetch(`${WHAPI_API_URL}/messages/document`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHAPI_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: normalizedPhone,
        media: `data:application/pdf;base64,${pdfBase64}`,
        filename: `${invoice.invoice_number}.pdf`,
        caption,
      }),
    });

    const sendData = await sendRes.json();

    if (!sendRes.ok) {
      console.error("Whapi send failed:", sendData);

      await logDelivery(invoiceId, normalizedPhone, "failed", null, JSON.stringify(sendData));

      return NextResponse.json(
        { error: "Failed to send WhatsApp message", details: sendData },
        { status: 502 },
      );
    }

    const messageId = sendData.message?.id || sendData.id || null;

    // 5. Log successful delivery
    await logDelivery(invoiceId, normalizedPhone, "sent", messageId);

    // 6. Update invoice: mark as sent on WhatsApp, and update status if draft
    const updateData: Record<string, any> = {
      sent_on_whatsapp: true,
      updated_at: new Date().toISOString(),
    };
    if (invoice.status === "draft") {
      updateData.status = "sent";
    }
    await supabase.from("invoices").update(updateData).eq("id", invoiceId);

    return NextResponse.json({
      success: true,
      messageId,
      recipient: normalizedPhone,
    });
  } catch (err: any) {
    console.error("WhatsApp send error:", err);
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
      channel: "whatsapp",
      recipient,
      status,
      external_message_id: externalMessageId,
      error_message: errorMessage || null,
    });
  } catch {
    // Don't fail the request if logging fails (table may not exist yet)
    console.warn("Failed to log delivery — invoice_delivery_log table may not exist");
  }
}
