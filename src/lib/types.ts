export interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  country: string | null
  created_at: string
}

export interface Invoice {
  id: string
  invoice_number: string
  client_id: string | null
  date_of_issue: string
  date_due: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  subtotal: number
  tax_percentage: number
  tax_amount: number
  discount_percentage: number
  discount_amount: number
  total: number
  currency: string
  notes: string | null
  category: string
  sent_on_whatsapp: boolean
  sent_on_email: boolean
  recurring_invoice_id: string | null
  is_auto_generated: boolean
  created_at: string
  updated_at: string
  client?: Client
  items?: InvoiceItem[]
  payments?: Payment[]
}

export interface InvoiceItem {
  id?: string
  invoice_id?: string
  description: string
  quantity: number
  unit_price: number
  amount: number
  sort_order: number
}

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  payment_date: string
  payment_method: 'bank_transfer' | 'cash' | 'payhere' | 'paypal' | 'other'
  reference: string | null
  notes: string | null
  created_at: string
}

export interface RecurringInvoice {
  id: string
  client_id: string
  currency: string
  tax_percentage: number
  discount_percentage: number
  discount_amount: number
  notes: string | null
  category: string
  day_of_month: number
  is_active: boolean
  auto_send_whatsapp: boolean
  generated_count: number
  next_generation_date: string
  created_at: string
  updated_at: string
  client?: Client
  items?: RecurringInvoiceItem[]
}

export interface RecurringInvoiceItem {
  id?: string
  recurring_invoice_id?: string
  description: string
  quantity: number
  unit_price: number
  amount: number
  sort_order: number
}

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

export interface Settings {
  id: string
  company_name: string
  company_email: string
  company_phone: string
  company_address: string
  company_website: string
  invoice_prefix: string
  invoice_number_digits: number
  default_currency: string
  default_tax_percentage: number
  default_payment_terms: number
  default_notes: string
}

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
