import { NextResponse } from "next/server";
import { listDeliveryLogs } from "@/server/queries/delivery-logs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const logs = await listDeliveryLogs(id);
  return NextResponse.json({ logs });
}
