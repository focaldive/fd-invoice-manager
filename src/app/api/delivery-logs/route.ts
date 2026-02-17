import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  const invoiceId = req.nextUrl.searchParams.get("invoiceId");

  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("invoice_delivery_log")
    .select("id, channel, recipient, status, created_at")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ logs: [] });
  }

  return NextResponse.json({ logs: data || [] });
}
