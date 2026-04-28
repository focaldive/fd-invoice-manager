import "server-only";
import { db } from "@/server/db/client";
import {
  invoiceDeliveryLog,
  type DeliveryChannel,
  type DeliveryStatus,
} from "@/server/db/schema";
import { desc, eq } from "drizzle-orm";

export async function listDeliveryLogs(invoiceId: string) {
  return db
    .select({
      id: invoiceDeliveryLog.id,
      channel: invoiceDeliveryLog.channel,
      recipient: invoiceDeliveryLog.recipient,
      status: invoiceDeliveryLog.status,
      createdAt: invoiceDeliveryLog.createdAt,
    })
    .from(invoiceDeliveryLog)
    .where(eq(invoiceDeliveryLog.invoiceId, invoiceId))
    .orderBy(desc(invoiceDeliveryLog.createdAt));
}

export async function logDelivery(args: {
  invoiceId: string;
  channel: DeliveryChannel;
  recipient: string;
  status: DeliveryStatus;
  externalMessageId?: string | null;
  errorMessage?: string | null;
}) {
  try {
    await db.insert(invoiceDeliveryLog).values({
      invoiceId: args.invoiceId,
      channel: args.channel,
      recipient: args.recipient,
      status: args.status,
      externalMessageId: args.externalMessageId ?? null,
      errorMessage: args.errorMessage ?? null,
    });
  } catch (err) {
    console.warn("Failed to log delivery", err);
  }
}
