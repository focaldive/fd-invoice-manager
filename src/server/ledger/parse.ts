import "server-only";
import type { LedgerKind } from "@/lib/ledger";
import { categorizeExpense, categorizeIncome, normalizeSheetType } from "./categorize";

export type Cell = string | number | boolean | null | undefined;

export type ParsedEntry = {
  kind: LedgerKind;
  sheetRow: number;
  entryNumber: number | null;
  entryDate: string | null;
  description: string;
  sheetType: string | null;
  category: string;
  amount: number;
  method: string | null;
};

export type ParseResult = { entries: ParsedEntry[]; warnings: string[] };

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Google Sheets serial day (days since 1899-12-30) or text like "May 11,2026" / "Sep 13 2026" / "2026-05-11". */
export function parseSheetDate(value: Cell): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = Date.UTC(1899, 11, 30) + Math.round(value) * 86_400_000;
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const s = String(value).trim();
  let m = /^([A-Za-z]{3})[A-Za-z]*\.?\s*(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{4})$/.exec(s);
  if (m) {
    const month = MONTHS[m[1].toLowerCase()];
    const day = Number(m[2]);
    if (month && day >= 1 && day <= 31) return `${m[3]}-${pad(month)}-${pad(day)}`;
    return null;
  }
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return `${m[1]}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s); // assume M/D/YYYY (Sheets US locale)
  if (m) return `${m[3]}-${pad(Number(m[1]))}-${pad(Number(m[2]))}`;
  return null;
}

/** 10700, "LKR 10,700.00", "-LKR 188,718.00", "(1,000)" → number; null when empty / not a number. */
export function parseSheetAmount(value: Cell): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const s = String(value).trim();
  if (!s) return null;
  const negative = s.includes("-") || /^\(.*\)$/.test(s);
  const digits = s.replace(/[^0-9.]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

const text = (v: Cell) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());

type Block = { start: number; cols: Record<string, number> };

/**
 * Locate the Income and Expenditure blocks by their header row (the row with
 * two "Number" cells). Columns are found by name, so adding a column such as
 * "Category" to the sheet doesn't break the import.
 */
function findBlocks(rows: Cell[][]): { headerRow: number; income: Block; expense: Block } | null {
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const row = rows[r] ?? [];
    const numberCols = row.flatMap((c, i) => (text(c).toLowerCase() === "number" ? [i] : []));
    if (numberCols.length < 2) continue;

    const block = (start: number, end: number): Block => {
      const cols: Record<string, number> = {};
      for (let i = start; i < end; i++) {
        const h = text(row[i]).toLowerCase();
        if (!h) continue;
        if (h === "number") cols.number = i;
        else if (h === "date") cols.date = i;
        else if (h === "project" || h === "description") cols.description = i;
        else if (h === "type") cols.type = i;
        else if (h.includes("amount")) cols.amount = i;
        else if (h === "method") cols.method = i;
        else if (h === "category") cols.category = i;
      }
      return { start, cols };
    };

    return {
      headerRow: r,
      income: block(numberCols[0], numberCols[1]),
      expense: block(numberCols[1], row.length),
    };
  }
  return null;
}

export function parseLedgerSheet(rows: Cell[][]): ParseResult {
  const found = findBlocks(rows);
  if (!found) throw new Error('Could not find the header row (two "Number" columns) in the sheet');

  const warnings: string[] = [];
  const entries: ParsedEntry[] = [];

  for (const [kind, block] of [
    ["income", found.income],
    ["expense", found.expense],
  ] as const) {
    const { cols } = block;
    if (cols.amount == null || cols.description == null) {
      throw new Error(`The ${kind} block is missing an amount or project column`);
    }
    for (let r = found.headerRow + 1; r < rows.length; r++) {
      const row = rows[r] ?? [];
      const sheetRow = r + 1;
      const description = text(row[cols.description]);
      const rawAmount = row[cols.amount];
      const amount = parseSheetAmount(rawAmount);
      // Pre-numbered empty rows (just "Number") are placeholders — skip silently.
      if (amount == null) {
        if (description) warnings.push(`${kind} row ${sheetRow} ("${description}") has no amount — skipped`);
        continue;
      }
      if (typeof rawAmount === "string") {
        warnings.push(
          `${kind} row ${sheetRow} amount "${text(rawAmount)}" is text, so the sheet's own SUM skips it — retype it as a number`,
        );
      }
      const rawDate = cols.date != null ? row[cols.date] : null;
      const entryDate = parseSheetDate(rawDate);
      if (!entryDate) {
        warnings.push(
          rawDate == null || rawDate === ""
            ? `${kind} row ${sheetRow} ("${description}") has no date`
            : `${kind} row ${sheetRow} has an unreadable date "${text(rawDate)}"`,
        );
      }
      const sheetType = kind === "income" && cols.type != null ? normalizeSheetType(text(row[cols.type])) : null;
      const sheetCategory = cols.category != null ? text(row[cols.category]).toLowerCase() : "";
      const category =
        sheetCategory ||
        (kind === "income" ? categorizeIncome(description, sheetType) : categorizeExpense(description));
      const num = cols.number != null ? Number(row[cols.number]) : NaN;

      entries.push({
        kind,
        sheetRow,
        entryNumber: Number.isFinite(num) ? num : null,
        entryDate,
        description: description || "(no description)",
        sheetType,
        category,
        amount,
        method: cols.method != null ? text(row[cols.method]) || null : null,
      });
    }
  }

  return { entries, warnings };
}
