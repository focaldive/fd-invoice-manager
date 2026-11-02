"use server";

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db/client";
import { invoices } from "@/server/db/schema";
import { requireSession } from "@/server/auth/session";

const Id = z.string().uuid();

/** Returns the invoice's share token, creating one on first use. */
export async function getOrCreateShareToken(invoiceId: string): Promise<string> {
  await requireSession();
  const id = Id.parse(invoiceId);

  const [row] = await db
    .select({ shareToken: invoices.shareToken })
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);
  if (!row) throw new Error("Invoice not found");
  if (row.shareToken) return row.shareToken;

  const token = randomBytes(24).toString("base64url"); // 32 chars, 192 bits
  await db.update(invoices).set({ shareToken: token }).where(eq(invoices.id, id));
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/receipts");
  return token;
}

/** Revokes the current link. A later share creates a fresh token. */
export async function revokeShareToken(invoiceId: string): Promise<void> {
  await requireSession();
  const id = Id.parse(invoiceId);
  await db.update(invoices).set({ shareToken: null }).where(eq(invoices.id, id));
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/receipts");
}
