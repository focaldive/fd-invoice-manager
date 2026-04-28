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
    companyEmail: "devfocaldive@gmail.com",
    companyPhone: "+94 77 123 4567",
    companyAddress: "Kurunegala, North Western Province, Sri Lanka",
    companyWebsite: "focaldive.com",
    invoicePrefix: "FD",
    invoiceNumberDigits: 3,
    defaultCurrency: "LKR",
    defaultTaxPercentage: "0",
    defaultPaymentTerms: 7,
    defaultNotes: "",
  });

  console.log("Seeded settings");
}

main()
  .then(() => pool.end().then(() => process.exit(0)))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
