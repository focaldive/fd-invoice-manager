import "server-only";
import { db } from "@/server/db/client";
import { settings } from "@/server/db/schema";

export async function getSettings() {
  const [row] = await db.select().from(settings).limit(1);
  return row ?? null;
}
