"use server";

import { db } from "@/server/db/client";
import { clients } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ClientInput = z.object({
  name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
});

export type ClientInputData = z.infer<typeof ClientInput>;

export async function createClient(input: ClientInputData) {
  const data = ClientInput.parse(input);
  const [row] = await db.insert(clients).values(data).returning();
  revalidatePath("/clients");
  return row;
}

export async function updateClient(id: string, input: ClientInputData) {
  const data = ClientInput.parse(input);
  const [row] = await db
    .update(clients)
    .set(data)
    .where(eq(clients.id, id))
    .returning();
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return row;
}

export async function deleteClient(id: string) {
  await db.delete(clients).where(eq(clients.id, id));
  revalidatePath("/clients");
}
