/**
 * Demo invoices for exercising the dashboard revenue chart, invoice list and receipts.
 *
 *   npm run db:seed:demo            # insert (skipped if demo invoices already exist)
 *   npm run db:seed:demo -- --reset # delete previous demo invoices, then insert fresh
 *
 * Spreads ~60 invoices across Jan 2025 → the current month for the seeded demo
 * clients. Older invoices are mostly paid (with a payment record, so receipts
 * work); recent ones mix sent / overdue / draft. Every demo invoice carries
 * DEMO_MARKER in its notes so it can be found and removed again.
 * Deterministic (seeded PRNG) — re-running --reset gives the same data.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/node-postgres";
import { inArray, like } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./schema";
import * as relations from "./relations";
import { getClientAbbreviation } from "../../lib/types";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema: { ...schema, ...relations } });

const DEMO_MARKER = "[demo data]";

// ── Deterministic randomness ──────────────────────────────────────────────
let seed = 20260101;
function rand() {
  // mulberry32
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => min + rand() * (max - min);

// ── Catalogue ─────────────────────────────────────────────────────────────
type Service = { description: string; category: string; lkr: [number, number]; usd: [number, number] };
const SERVICES: Service[] = [
  { description: "Website design & development", category: "project_quotation", lkr: [250_000, 750_000], usd: [1_500, 4_500] },
  { description: "Milestone 2 — frontend build", category: "milestone_payment", lkr: [150_000, 400_000], usd: [900, 2_500] },
  { description: "Monthly system maintenance", category: "system_maintenance", lkr: [45_000, 90_000], usd: [300, 600] },
  { description: "Cloud hosting & domain (annual)", category: "hosting", lkr: [35_000, 80_000], usd: [200, 500] },
  { description: "Brand identity package", category: "graphic_design", lkr: [120_000, 300_000], usd: [800, 2_000] },
  { description: "Social media creatives (10 posts)", category: "graphic_design", lkr: [40_000, 85_000], usd: [250, 550] },
  { description: "Technical consultation (hours)", category: "consultation", lkr: [15_000, 30_000], usd: [90, 180] },
  { description: "SaaS subscription — Pro plan", category: "subscription", lkr: [25_000, 60_000], usd: [150, 400] },
];

// Currency per client country (dashboard filters by currency; LKR is the default view)
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  "Sri Lanka": "LKR",
  "United Arab Emirates": "AED",
  Qatar: "QAR",
  "United Kingdom": "GBP",
  Australia: "AUD",
};
// Rough USD → currency factors so non-LKR amounts look plausible
const FROM_USD: Record<string, number> = { USD: 1, AED: 3.67, QAR: 3.64, GBP: 0.79, AUD: 1.52 };

const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, 12);

async function main() {
  const reset = process.argv.includes("--reset");

  const existingDemo = await db
    .select({ id: schema.invoices.id })
    .from(schema.invoices)
    .where(like(schema.invoices.notes, `%${DEMO_MARKER}%`));

  if (existingDemo.length > 0) {
    if (!reset) {
      console.log(`${existingDemo.length} demo invoices already exist — run with --reset to recreate`);
      return;
    }
    const ids = existingDemo.map((r) => r.id);
    await db.delete(schema.payments).where(inArray(schema.payments.invoiceId, ids));
    await db.delete(schema.invoiceItems).where(inArray(schema.invoiceItems.invoiceId, ids));
    await db.delete(schema.invoices).where(inArray(schema.invoices.id, ids));
    console.log(`Removed ${ids.length} previous demo invoices`);
  }

  const clients = await db.select().from(schema.clients);
  if (clients.length === 0) {
    console.log("No clients found — run `npm run db:seed` first");
    return;
  }
  const local = clients.filter((c) => (c.country ?? "Sri Lanka") === "Sri Lanka");
  const overseas = clients.filter((c) => (c.country ?? "Sri Lanka") !== "Sri Lanka");

  const takenNumbers = new Set(
    (await db.select({ n: schema.invoices.invoiceNumber }).from(schema.invoices)).map((r) => r.n),
  );

  const now = new Date();
  const start = new Date(2025, 0, 1);
  let created = 0;

  for (let m = new Date(start); m <= now; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    const monthsAgo = (now.getFullYear() - m.getFullYear()) * 12 + (now.getMonth() - m.getMonth());
    // Busier towards year-end and in 2026 → a visible trend on the chart
    const count = 2 + Math.floor(rand() * 2) + (m.getMonth() >= 9 ? 1 : 0) + (m.getFullYear() >= 2026 ? 1 : 0);

    for (let i = 0; i < count; i++) {
      const client = overseas.length > 0 && rand() < 0.25 ? pick(overseas) : pick(local.length ? local : clients);
      const currency = CURRENCY_BY_COUNTRY[client.country ?? ""] ?? "LKR";

      const lastDay = monthsAgo === 0 ? now.getDate() : new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      const issue = new Date(m.getFullYear(), m.getMonth(), 1 + Math.floor(rand() * lastDay), 12);
      const due = addDays(issue, 7);

      // Status by age: history is mostly settled, recent months still in flight
      const r = rand();
      const status =
        monthsAgo >= 2
          ? r < 0.88 ? "paid" : r < 0.95 ? "cancelled" : "overdue"
          : monthsAgo === 1
            ? r < 0.6 ? "paid" : r < 0.85 ? "overdue" : "sent"
            : r < 0.35 ? "paid" : r < 0.75 ? "sent" : "draft";

      // 1–3 line items
      const services = [...SERVICES].sort(() => rand() - 0.5).slice(0, 1 + Math.floor(rand() * 3));
      const items = services.map((s, idx) => {
        const quantity = s.category === "consultation" ? 2 + Math.floor(rand() * 8) : 1;
        const unit =
          currency === "LKR"
            ? roundTo(between(...s.lkr), 1_000)
            : roundTo(between(...s.usd) * (FROM_USD[currency] ?? 1), 5);
        return { description: s.description, quantity, unitPrice: unit, amount: unit * quantity, sortOrder: idx };
      });
      const subtotal = items.reduce((sum, it) => sum + it.amount, 0);
      const discount = rand() < 0.15 ? roundTo(subtotal * 0.1, currency === "LKR" ? 1_000 : 5) : 0;
      const total = subtotal - discount;

      // FD-{ABBR}-{YYMM}-{SEQ}, unique across existing invoices
      const prefix = `FD-${getClientAbbreviation(client.name)}-${String(issue.getFullYear()).slice(2)}${String(issue.getMonth() + 1).padStart(2, "0")}`;
      let seq = 1;
      while (takenNumbers.has(`${prefix}-${String(seq).padStart(3, "0")}`)) seq++;
      const invoiceNumber = `${prefix}-${String(seq).padStart(3, "0")}`;
      takenNumbers.add(invoiceNumber);

      const paidOn = addDays(issue, 2 + Math.floor(rand() * 12));
      const [inv] = await db
        .insert(schema.invoices)
        .values({
          invoiceNumber,
          clientId: client.id,
          dateOfIssue: iso(issue),
          dateDue: iso(due),
          status: status as (typeof schema.invoiceStatuses)[number],
          subtotal: subtotal.toFixed(2),
          taxPercentage: "0",
          taxAmount: "0",
          discountPercentage: discount ? "10" : "0",
          discountAmount: discount.toFixed(2),
          total: total.toFixed(2),
          currency,
          category: services[0].category,
          notes: `Thank you for your business! ${DEMO_MARKER}`,
          createdAt: issue,
          updatedAt: status === "paid" ? paidOn : issue,
        })
        .returning({ id: schema.invoices.id });

      await db.insert(schema.invoiceItems).values(
        items.map((it) => ({
          invoiceId: inv.id,
          description: it.description,
          quantity: String(it.quantity),
          unitPrice: it.unitPrice.toFixed(2),
          amount: it.amount.toFixed(2),
          sortOrder: it.sortOrder,
        })),
      );

      if (status === "paid") {
        await db.insert(schema.payments).values({
          invoiceId: inv.id,
          amount: total.toFixed(2),
          paymentDate: iso(paidOn > now ? now : paidOn),
          paymentMethod: currency === "LKR" ? pick(["bank_transfer", "bank_transfer", "payhere", "cash"] as const) : pick(["bank_transfer", "paypal"] as const),
          reference: `TXN-${Math.floor(between(100000, 999999))}`,
        });
      }
      created++;
    }
  }

  console.log(`Seeded ${created} demo invoices (Jan 2025 → ${now.toLocaleString("en", { month: "short", year: "numeric" })})`);
}

main()
  .then(() => pool.end().then(() => process.exit(0)))
  .catch((err) => {
    console.error(err);
    pool.end().finally(() => process.exit(1));
  });
