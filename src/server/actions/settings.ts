"use server";

import { db } from "@/server/db/client";
import { settings } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const SettingsInput = z.object({
  companyName: z.string().min(1),
  companyEmail: z.string().email(),
  companyPhone: z.string().min(1),
  companyAddress: z.string().min(1),
  companyWebsite: z.string().min(1),
  invoicePrefix: z.string().min(1),
  invoiceNumberDigits: z.number().int().min(1).max(10),
  defaultCurrency: z.string().min(1),
  defaultTaxPercentage: z.number().min(0),
  defaultPaymentTerms: z.number().int().min(0),
  defaultNotes: z.string(),
});

export async function updateSettings(input: z.infer<typeof SettingsInput>) {
  const data = SettingsInput.parse(input);

  const [existing] = await db.select({ id: settings.id }).from(settings).limit(1);

  if (!existing) {
    await db.insert(settings).values({
      ...data,
      defaultTaxPercentage: String(data.defaultTaxPercentage),
    });
  } else {
    await db
      .update(settings)
      .set({
        ...data,
        defaultTaxPercentage: String(data.defaultTaxPercentage),
        updatedAt: new Date(),
      })
      .where(eq(settings.id, existing.id));
  }

  revalidatePath("/settings");
  revalidatePath("/");
}
