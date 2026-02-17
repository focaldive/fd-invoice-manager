-- Recurring Invoices Feature — SQL Migration
-- Run this in the Supabase SQL Editor

-- 1. Create recurring_invoices table
CREATE TABLE recurring_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'LKR',
  tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  day_of_month INTEGER NOT NULL DEFAULT 1 CHECK (day_of_month >= 1 AND day_of_month <= 28),
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_send_whatsapp BOOLEAN NOT NULL DEFAULT false,
  generated_count INTEGER NOT NULL DEFAULT 0,
  next_generation_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create recurring_invoice_items table
CREATE TABLE recurring_invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_invoice_id UUID NOT NULL REFERENCES recurring_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- 3. Add columns to invoices table
ALTER TABLE invoices
  ADD COLUMN recurring_invoice_id UUID REFERENCES recurring_invoices(id) ON DELETE SET NULL,
  ADD COLUMN is_auto_generated BOOLEAN NOT NULL DEFAULT false;

-- 4. Enable RLS (match your existing policy pattern)
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoice_items ENABLE ROW LEVEL SECURITY;

-- 5. Permissive policies (adjust to match your existing RLS approach)
CREATE POLICY "Allow all for recurring_invoices" ON recurring_invoices
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for recurring_invoice_items" ON recurring_invoice_items
  FOR ALL USING (true) WITH CHECK (true);
