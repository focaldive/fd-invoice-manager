import type { InferSelectModel } from "drizzle-orm"
import type {
  clients,
  invoices,
  invoiceItems,
  payments,
  recurringInvoices,
  recurringInvoiceItems,
  settings,
  employees,
  payslips,
  payslipItems,
} from "@/server/db/schema"

export type Client = InferSelectModel<typeof clients>
export type Invoice = InferSelectModel<typeof invoices> & {
  client?: Client | null
  items?: InvoiceItem[]
  payments?: Payment[]
}
export type InvoiceItem = InferSelectModel<typeof invoiceItems>
export type Payment = InferSelectModel<typeof payments>
export type RecurringInvoice = InferSelectModel<typeof recurringInvoices> & {
  client?: Client | null
  items?: RecurringInvoiceItem[]
}
export type RecurringInvoiceItem = InferSelectModel<typeof recurringInvoiceItems>

export type Employee = InferSelectModel<typeof employees>
export type Payslip = InferSelectModel<typeof payslips> & {
  employee?: Employee | null
  items?: PayslipItem[]
}
export type PayslipItem = InferSelectModel<typeof payslipItems>

export function computeNextGenerationDate(dayOfMonth: number): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const target = new Date(year, month, dayOfMonth)
  // If the day has already passed this month, use next month
  if (target <= now) {
    target.setMonth(target.getMonth() + 1)
  }
  const y = target.getFullYear()
  const m = String(target.getMonth() + 1).padStart(2, '0')
  const d = String(target.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const CATEGORIES = [
  { value: 'system_maintenance', label: 'System Maintenance' },
  { value: 'project_quotation', label: 'Project Quotation' },
  { value: 'milestone_payment', label: 'Milestone Payment' },
  { value: 'hosting', label: 'Hosting & Domain' },
  { value: 'domain', label: 'Domain' },
  { value: 'graphic_design', label: 'Graphic Design' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'other', label: 'Other' },
] as const

export const STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  { value: 'sent', label: 'Sent', color: 'bg-[#d6f5de] text-[#115432]' },
  { value: 'paid', label: 'Paid', color: 'bg-[#188349] text-white' },
  { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-700' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-amber-100 text-amber-700' },
] as const

export const CURRENCIES = [
  { value: 'LKR', label: 'LKR - Sri Lankan Rupee', symbol: 'LKR' },
  { value: 'USD', label: 'USD - US Dollar', symbol: '$' },
  { value: 'AED', label: 'AED - UAE Dirham', symbol: 'AED' },
  { value: 'QAR', label: 'QAR - Qatari Riyal', symbol: 'QAR' },
  { value: 'SAR', label: 'SAR - Saudi Riyal', symbol: 'SAR' },
  { value: 'GBP', label: 'GBP - British Pound', symbol: '£' },
  { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
  { value: 'AUD', label: 'AUD - Australian Dollar', symbol: 'A$' },
  { value: 'INR', label: 'INR - Indian Rupee', symbol: '₹' },
  { value: 'SGD', label: 'SGD - Singapore Dollar', symbol: 'S$' },
] as const

export type CurrencyCode = typeof CURRENCIES[number]['value']

export const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'payhere', label: 'PayHere' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'other', label: 'Other' },
] as const

export const COMPANY = {
  name: 'FocalDive (Pvt) Ltd',
  address: 'Waun Right,\nManalkundru\nPuttalam, Sri Lanka',
  email: 'accounts@focaldive.io',
  phone: '+94 77 743 2106',
  website: 'focaldive.io',
}

export type Settings = InferSelectModel<typeof settings>

export function formatCurrency(amount: number, currency: string): string {
  const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const curr = CURRENCIES.find(c => c.value === currency)
  if (!curr) return `${currency} ${formatted}`
  const symbol = curr.symbol
  // Symbols that go before the number
  if (['$', '£', '€', '₹'].includes(symbol) || symbol.endsWith('$')) {
    return `${symbol}${formatted}`
  }
  return `${symbol} ${formatted}`
}

export function getCategoryLabel(value: string): string {
  return CATEGORIES.find(c => c.value === value)?.label || value
}

/**
 * Generate client abbreviation from company name.
 * Takes the first letter of each word, uppercased. Max 4 chars.
 * e.g. "Zigzag Car Wash" => "ZZCW", "Arshaq" => "ARSH", "FocalDive" => "FD"
 * Words like "Pvt", "Ltd", "Inc", "LLC", "Co" are excluded.
 */
export function getClientAbbreviation(name: string): string {
  const exclude = ['pvt', 'ltd', 'inc', 'llc', 'co', 'the', 'and', 'of']
  const words = name.trim().split(/\s+/).filter(w => !exclude.includes(w.toLowerCase()))

  if (words.length === 0) return 'XXXX'

  if (words.length === 1) {
    // Single word: take first 4 consonants/chars
    return words[0].replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase()
  }

  // Multiple words: first letter of each word
  const abbr = words.map(w => w.charAt(0)).join('').toUpperCase()
  return abbr.slice(0, 4)
}

/**
 * Generate invoice number in format: FD-{ABBR}-YYMM-SEQ
 * e.g. FD-ZZCW-2601-001
 */
export function buildInvoiceNumber(clientAbbr: string, yearMonth: string, seq: number): string {
  return `FD-${clientAbbr}-${yearMonth}-${String(seq).padStart(3, '0')}`
}

export function getStatusInfo(value: string) {
  return STATUSES.find(s => s.value === value) || STATUSES[0]
}

// ============================================================
// Payslips / Employees
// ============================================================

export const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
] as const

export const DEPARTMENTS = [
  { value: 'Designing', label: 'Designing', abbr: 'DES' },
  { value: 'Development', label: 'Development', abbr: 'DEV' },
  { value: 'Marketing', label: 'Marketing', abbr: 'MKT' },
  { value: 'Sales', label: 'Sales', abbr: 'SAL' },
  { value: 'Operations', label: 'Operations', abbr: 'OPS' },
  { value: 'Finance', label: 'Finance', abbr: 'FIN' },
  { value: 'Human Resources', label: 'Human Resources', abbr: 'HR' },
  { value: 'Management', label: 'Management', abbr: 'MGT' },
] as const

/** Designations grouped by department value (keys match DEPARTMENTS[].value). */
export const DESIGNATIONS_BY_DEPARTMENT: Record<string, readonly string[]> = {
  Designing: ['Graphic Designer', 'UI/UX Designer', 'Web Designer', 'Motion Designer', 'Brand Designer'],
  Development: ['Frontend Developer', 'Backend Developer', 'Full-Stack Developer', 'Mobile App Developer', 'Software Engineer', 'QA Engineer', 'DevOps Engineer'],
  Marketing: ['Digital Marketer', 'Marketing Executive', 'Content Writer', 'SEO Specialist', 'Social Media Manager'],
  Sales: ['Sales Executive', 'Business Development Executive', 'Account Manager'],
  Operations: ['Operations Manager', 'Operations Executive', 'Project Manager', 'Business Analyst'],
  Finance: ['Accountant', 'Finance Executive', 'Financial Analyst'],
  'Human Resources': ['HR Manager', 'HR Executive', 'Recruiter'],
  Management: ['Chief Executive Officer (CEO)', 'Chief Operating Officer (COO)', 'Chief Technology Officer (CTO)', 'Director'],
}

/** Returns the designations available for a department (empty if unknown). */
export function getDesignationsForDepartment(department: string): readonly string[] {
  return DESIGNATIONS_BY_DEPARTMENT[department] ?? []
}

export const PAYMENT_MODES = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
] as const

export const PAYSLIP_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  { value: 'paid', label: 'Paid', color: 'bg-[#188349] text-white' },
] as const

export const EMPLOYEE_STATUSES = [
  { value: 'active', label: 'Active', color: 'bg-[#188349] text-white' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-700' },
] as const

export const PAYSLIP_ITEM_TYPES = [
  { value: 'earning', label: 'Earning' },
  { value: 'deduction', label: 'Deduction' },
] as const

export function getMonthLabel(month: number): string {
  return MONTHS.find(m => m.value === month)?.label || String(month)
}

export function getPaymentModeLabel(value: string): string {
  return PAYMENT_MODES.find(m => m.value === value)?.label || value
}

export function getPayslipStatusInfo(value: string) {
  return PAYSLIP_STATUSES.find(s => s.value === value) || PAYSLIP_STATUSES[0]
}

/**
 * Generate a 3-letter department abbreviation used in employee numbers.
 * Known departments use their predefined abbreviation; otherwise the first
 * three alphabetic characters of the name are used.
 * e.g. "Designing" => "DES", "Development" => "DEV"
 */
export function getDepartmentAbbreviation(department: string): string {
  const known = DEPARTMENTS.find(
    d => d.value.toLowerCase() === department.trim().toLowerCase(),
  )
  if (known) return known.abbr
  return department.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'GEN'
}

/**
 * Generate an employee number in format: FD-{DEPT}-{YY}-{SEQ}
 * e.g. FD-DES-26-001
 */
export function buildEmployeeNumber(deptAbbr: string, yy: string, seq: number): string {
  return `FD-${deptAbbr}-${yy}-${String(seq).padStart(3, '0')}`
}

/**
 * Generate a payslip slip number in format: FD-{DDMMYY}-{SEQ}
 * where DDMMYY is derived from the payment date.
 * e.g. FD-100626-001 (paid 2026.06.10)
 */
export function buildSlipNumber(ddmmyy: string, seq: number): string {
  return `FD-${ddmmyy}-${String(seq).padStart(3, '0')}`
}

/** Net pay = total earnings - total deductions. */
export function computeNetPay(
  items: { type: string; amount: number }[],
): { grossPay: number; totalDeductions: number; netPay: number } {
  const grossPay = items
    .filter(i => i.type === 'earning')
    .reduce((sum, i) => sum + i.amount, 0)
  const totalDeductions = items
    .filter(i => i.type === 'deduction')
    .reduce((sum, i) => sum + i.amount, 0)
  return { grossPay, totalDeductions, netPay: grossPay - totalDeductions }
}
