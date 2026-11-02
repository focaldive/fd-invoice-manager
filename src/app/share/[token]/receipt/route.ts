import { sharedPdfResponse } from "@/server/share/pdf-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return sharedPdfResponse(token, "receipt");
}
