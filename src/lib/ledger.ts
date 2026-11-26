// Browser-safe ledger DTOs and labels (mirror of the FD-Accounts Google Sheet).

export type LedgerKind = "income" | "expense";

export type LedgerEntry = {
  id: string;
  kind: LedgerKind;
  sheetRow: number;
  entryNumber: number | null;
  entryDate: string | null; // YYYY-MM-DD
  description: string;
  sheetType: string | null;
  category: string;
  amount: number;
  method: string | null;
};

export type LedgerSyncInfo = {
  configured: boolean;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  incomeRows: number;
  expenseRows: number;
};

/**
 * Categories that are NOT operating cash flow. They still count toward the
 * cash balance (so it matches the sheet's "Current Balance"), but are left out
 * of income / expense / profit figures.
 */
export const NON_OPERATING_CATEGORIES = new Set(["capital", "opening"]);

export const LEDGER_CATEGORIES: Record<string, { label: string; color: string }> = {
  // income
  maintenance: { label: "Maintenance", color: "#9bf019" },
  phase: { label: "Project phase", color: "#4bd200" },
  advance: { label: "Advance", color: "#60a5fa" },
  other_income: { label: "Other income", color: "#a3a3a3" },
  capital: { label: "Capital / loan", color: "#f59e0b" },
  // expense
  salaries: { label: "Salaries & allowances", color: "#9bf019" },
  software: { label: "Software & AI", color: "#60a5fa" },
  hosting: { label: "Hosting, domains & SMS", color: "#a78bfa" },
  utilities: { label: "Utilities & telecom", color: "#f59e0b" },
  office: { label: "Office & rent", color: "#f472b6" },
  food: { label: "Food & operations", color: "#fb923c" },
  marketing: { label: "Marketing & ads", color: "#22d3ee" },
  travel: { label: "Travel & events", color: "#34d399" },
  bank: { label: "Bank charges", color: "#94a3b8" },
  donations: { label: "Donations", color: "#e879f9" },
  other_expense: { label: "Other", color: "#737373" },
  opening: { label: "Opening balance", color: "#525252" },
};

export function getLedgerCategory(value: string) {
  return LEDGER_CATEGORIES[value] ?? { label: value, color: "#737373" };
}

export function isOperating(entry: Pick<LedgerEntry, "category">): boolean {
  return !NON_OPERATING_CATEGORIES.has(entry.category);
}

/**
 * Totals the way the sheet computes them. The "Last year closing" row (category
 * `opening`) is a signed carried-forward balance, not an expense: the sheet's
 * expenditure total is `=SUM(L7:L) - L6`, so a closing of -188,718 lowers the
 * balance by 188,718.
 *   balance = opening + Σincome − Σexpense(excluding opening)
 */
export function ledgerTotals(entries: Pick<LedgerEntry, "kind" | "category" | "amount">[]) {
  let opening = 0;
  let income = 0;
  let expense = 0;
  for (const e of entries) {
    if (e.kind === "expense" && e.category === "opening") opening += e.amount;
    else if (e.kind === "income") income += e.amount;
    else expense += e.amount;
  }
  return { opening, income, expense, balance: opening + income - expense };
}
