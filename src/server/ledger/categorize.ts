import "server-only";

/**
 * Keyword rules that turn a free-text sheet row into a category. First match
 * wins, so specific rules (food, bank) come before the broad staff-name rule
 * ("Abdul food" is food, "Abdul advance" is salaries).
 *
 * If the sheet ever grows a "Category" column, its value is used instead and
 * these rules become a fallback.
 */
const EXPENSE_RULES: Array<[string, RegExp]> = [
  ["opening", /last year closing|opening balance|carried forward/i],
  ["bank", /\bbank\b|transection|transaction fee|service charge|annual fee|anual fee|account fee/i],
  ["donations", /donation|mosque|mosuqe/i],
  ["software", /claude|anthropic|canva|linkedin|x corp|openai|chatgpt|figma|github/i],
  ["hosting", /hostinger|hostonger|\baws\b|\bovh\b|\bvps\b|domain|namecheap|register\.lk|server|notify|mail ?box/i],
  ["marketing", /facebook|facebk|\bfb\b|\bad\b|\bads\b|youtube|marketing|campa/i],
  ["utilities", /\bceb\b|\bslt\b|fiber|water ?board|waterboard|dialog|hutch|mobitel|reload|realod|reaload|swytch|\bsim\b/i],
  ["food", /food|lunch|dinner|breakfast|hotel|shawarma|snack|snaks|tea\b|iftar|operation(al)? exp|opreational|oprational|opertaional/i],
  ["travel", /travel|trip|petrol|\bbus\b|bike|futsal|vollyball|hall|graduation|event/i],
  ["office", /rent|office|water ?can|water cane|water bottle|water \*|water can|cleaner|grocery|shop|stationary|print|book|mic purchase|nfc|t-?shirt|purchas/i],
  [
    "salaries",
    /salary|\bsal\b|allowance|allaowance|allowence|bonus|wage|advance|adnvance|\badv\b|b\/l|debt|cred|arshaq|arhsaq|abdul|abdhul|\babd\b|rishad|jassim|rahima|ikshaf|muhamin|muahamin|yoonus|hizam/i,
  ],
];

export function categorizeExpense(description: string): string {
  for (const [category, re] of EXPENSE_RULES) if (re.test(description)) return category;
  return "other_expense";
}

/** Income uses the sheet's Type column; credits/investments are capital, not revenue. */
export function categorizeIncome(description: string, sheetType: string | null): string {
  if (/\b(credit|invest(ment)?|loan|capital)\b/i.test(description)) return "capital";
  switch (sheetType) {
    case "maintenance":
      return "maintenance";
    case "phase":
      return "phase";
    case "advance":
      return "advance";
    default:
      return "other_income";
  }
}

/** "Maintanance " → "maintenance"; free text otherwise lower-cased. */
export function normalizeSheetType(raw: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  if (/^main/.test(t)) return "maintenance";
  return t;
}
