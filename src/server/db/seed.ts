import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import * as relations from "./relations";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema: { ...schema, ...relations } });

async function main() {
  const existing = await db.select().from(schema.settings).limit(1);
  if (existing.length > 0) {
    console.log("Settings row already exists — skipping seed");
    return;
  }

  await db.insert(schema.settings).values({
    companyName: "FocalDive (Pvt) Ltd",
    companyEmail: "accounts@focaldive.io",
    companyPhone: "+94 77 743 2106",
    companyAddress: "Waun Right,\nManalkundru\nPuttalam, Sri Lanka",
    companyWebsite: "focaldive.io",
    invoicePrefix: "FD",
    invoiceNumberDigits: 3,
    defaultCurrency: "LKR",
    defaultTaxPercentage: "0",
    defaultPaymentTerms: 7,
    defaultNotes:
      "Terms:\n1. Please settle the due amount within 3-4 business days.\n2. Services are non-refundable once delivered\n3. Please include the invoice number in your payment reference.\n\nNotes:\nThank you for your business!\nQuestions? Contact us at accounts@focaldive.io",
  });

  console.log("Seeded settings");
}

main()
  .then(() => pool.end().then(() => process.exit(0)))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
