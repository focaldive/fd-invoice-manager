import { NextResponse } from "next/server";
import { z } from "zod";
import { checkCredentials } from "@/server/auth/credentials";
import { createSession } from "@/server/auth/session";

const Body = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!checkCredentials(parsed.data.username, parsed.data.password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await createSession({ username: parsed.data.username });
  return NextResponse.json({ ok: true });
}
