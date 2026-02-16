"use client"

import { AppShell } from "@/components/app-shell"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Save, RotateCcw } from "lucide-react"

interface Settings {
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

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    const { data } = await supabase.from("settings").select("*").limit(1).single()
    if (data) setSettings(data as Settings)
    setLoading(false)
  }

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    const { error } = await supabase
      .from("settings")
      .update({
        company_name: settings.company_name,
        company_email: settings.company_email,
        company_phone: settings.company_phone,
        company_address: settings.company_address,
        company_website: settings.company_website,
        invoice_prefix: settings.invoice_prefix,
        invoice_number_digits: settings.invoice_number_digits,
        default_currency: settings.default_currency,
        default_tax_percentage: settings.default_tax_percentage,
        default_payment_terms: settings.default_payment_terms,
        default_notes: settings.default_notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id)

    if (error) {
      toast.error("Failed to save settings")
    } else {
      toast.success("Settings saved")
    }
    setSaving(false)
  }

  function handleReset() {
    if (!settings) return
    if (!confirm("Reset all settings to defaults?")) return
    setSettings({
      ...settings,
      company_name: "FocalDive (Pvt) Ltd",
      company_email: "devfocaldive@gmail.com",
      company_phone: "",
      company_address: "Kurunegala, Sri Lanka",
      company_website: "",
      invoice_prefix: "FD-INV",
      invoice_number_digits: 4,
      default_currency: "LKR",
      default_tax_percentage: 0,
      default_payment_terms: 14,
      default_notes: "Payment is due within 14 days. Bank details will be shared separately.",
    })
    toast.info("Settings reset to defaults. Click Save to apply.")
  }

  function update(field: keyof Settings, value: string | number) {
    if (!settings) return
    setSettings({ ...settings, [field]: value })
  }

  if (loading) {
    return (
      <AppShell>
        <p className="text-center text-muted-foreground py-20 text-sm">Loading...</p>
      </AppShell>
    )
  }

  if (!settings) {
    return (
      <AppShell>
        <p className="text-center text-muted-foreground py-20 text-sm">Settings not found. Please check database.</p>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-10 max-w-3xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-5xl font-bold tracking-tight">Settings</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="h-9 rounded-full">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="h-9 rounded-full">
              <Save className="mr-1.5 h-3.5 w-3.5" /> {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Company Details */}
        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Company Details</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Your company information used on invoices and PDFs</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Company Name</Label>
                <Input
                  value={settings.company_name}
                  onChange={(e) => update("company_name", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input
                  type="email"
                  value={settings.company_email}
                  onChange={(e) => update("company_email", e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Phone</Label>
                <Input
                  value={settings.company_phone}
                  onChange={(e) => update("company_phone", e.target.value)}
                  placeholder="+94 77 123 4567"
                  className="mt-1.5 font-mono"
                />
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Website</Label>
                <Input
                  value={settings.company_website}
                  onChange={(e) => update("company_website", e.target.value)}
                  placeholder="https://focaldive.com"
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Address</Label>
              <Textarea
                value={settings.company_address}
                onChange={(e) => update("company_address", e.target.value)}
                rows={2}
                className="mt-1.5"
              />
            </div>
          </div>
        </section>

        {/* Invoice Configuration */}
        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Invoice Configuration</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Customize invoice numbering and default values</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Invoice Prefix</Label>
                  <Input
                    value={settings.invoice_prefix}
                    onChange={(e) => update("invoice_prefix", e.target.value)}
                    className="mt-1.5 font-mono"
                    placeholder="FD"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Format: <span className="font-mono font-medium text-foreground">{settings.invoice_prefix}-ABBR-YYMM-{String(1).padStart(settings.invoice_number_digits, "0")}</span>
                  </p>
                </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Number Digits</Label>
                <Select
                  value={String(settings.invoice_number_digits)}
                  onValueChange={(v) => update("invoice_number_digits", parseInt(v))}
                >
                  <SelectTrigger className="mt-1.5 font-mono"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 digits (001)</SelectItem>
                    <SelectItem value="4">4 digits (0001)</SelectItem>
                    <SelectItem value="5">5 digits (00001)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Default Currency</Label>
                <Select
                  value={settings.default_currency}
                  onValueChange={(v) => update("default_currency", v)}
                >
                  <SelectTrigger className="mt-1.5 font-mono"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LKR">LKR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Default Tax %</Label>
                <Input
                  type="number"
                  value={settings.default_tax_percentage}
                  onChange={(e) => update("default_tax_percentage", parseFloat(e.target.value) || 0)}
                  className="mt-1.5 font-mono"
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Payment Terms (days)</Label>
                <Input
                  type="number"
                  value={settings.default_payment_terms}
                  onChange={(e) => update("default_payment_terms", parseInt(e.target.value) || 14)}
                  className="mt-1.5 font-mono"
                  min={1}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Default Invoice Notes</Label>
              <Textarea
                value={settings.default_notes}
                onChange={(e) => update("default_notes", e.target.value)}
                rows={3}
                className="mt-1.5 text-sm"
              />
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
