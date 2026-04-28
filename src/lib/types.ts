import type { InferSelectModel } from "drizzle-orm"
import type {
  clients,
  invoices,
  invoiceItems,
  payments,
  recurringInvoices,
  recurringInvoiceItems,
  settings,
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
  address: 'Kurunegala, North Western Province, Sri Lanka',
  email: 'devfocaldive@gmail.com',
  phone: '+94 77 123 4567',
  website: 'focaldive.com',
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
