import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import * as relations from "./relations";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema: { ...schema, ...relations } });

// Demo clients — fictional companies with placeholder (.example) contact details.
const DEMO_CLIENTS: (typeof schema.clients.$inferInsert)[] = [
  { name: "Zig Zag Creative Works", email: "accounts@zigzagcreative.example", phone: "+94 11 234 5678", address: "45 Ward Place, Colombo 07", country: "Sri Lanka" },
  { name: "Ceylon Spice Traders (Pvt) Ltd", email: "finance@ceylonspice.example", phone: "+94 81 222 3344", address: "112 Peradeniya Road, Kandy", country: "Sri Lanka" },
  { name: "Blue Lagoon Resorts", email: "billing@bluelagoon.example", phone: "+94 91 223 4455", address: "8 Lighthouse Street, Galle Fort", country: "Sri Lanka" },
  { name: "Lanka Agri Exports", email: "ap@lankaagri.example", phone: "+94 37 222 9911", address: "21 Dambulla Road, Kurunegala", country: "Sri Lanka" },
  { name: "Desert Bloom Trading LLC", email: "accounts@desertbloom.example", phone: "+971 4 555 0142", address: "Office 1204, Business Bay, Dubai", country: "United Arab Emirates" },
  { name: "Al Noor Logistics", email: "payables@alnoor.example", phone: "+974 4 455 0198", address: "Building 33, West Bay, Doha", country: "Qatar" },
  { name: "Northbridge Analytics Ltd", email: "invoices@northbridge.example", phone: "+44 20 7946 0321", address: "14 Clerkenwell Road, London", country: "United Kingdom" },
  { name: "Harbour & Pine Studio", email: "hello@harbourpine.example", phone: "+61 2 5550 1187", address: "3/27 Crown Street, Surry Hills NSW", country: "Australia" },
];

async function seedClients() {
  const existing = await db.select({ id: schema.clients.id }).from(schema.clients).limit(1);
  if (existing.length > 0) {
    console.log("Clients already exist — skipping demo clients");
    return;
  }
  await db.insert(schema.clients).values(DEMO_CLIENTS);
  console.log(`Seeded ${DEMO_CLIENTS.length} demo clients`);
}

async function main() {
  await seedSettings();
  await seedClients();
}

async function seedSettings() {
  const existing = await db.select().from(schema.settings).limit(1);
  if (existing.length > 0) {
    console.log("Settings row already exists — skipping settings");
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
