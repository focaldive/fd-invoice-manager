"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Save, RotateCcw } from "lucide-react";
import { CURRENCIES } from "@/lib/types";
import { updateSettings } from "@/server/actions/settings";
import type { getSettings } from "@/server/queries/settings";

type SettingsRow = NonNullable<Awaited<ReturnType<typeof getSettings>>>;

type FormState = {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyWebsite: string;
  invoicePrefix: string;
  invoiceNumberDigits: number;
  defaultCurrency: string;
  defaultTaxPercentage: number;
  defaultPaymentTerms: number;
  defaultNotes: string;
};

function toFormState(s: SettingsRow): FormState {
  return {
    companyName: s.companyName,
    companyEmail: s.companyEmail,
    companyPhone: s.companyPhone,
    companyAddress: s.companyAddress,
    companyWebsite: s.companyWebsite,
    invoicePrefix: s.invoicePrefix,
    invoiceNumberDigits: s.invoiceNumberDigits,
    defaultCurrency: s.defaultCurrency,
    defaultTaxPercentage: Number(s.defaultTaxPercentage),
    defaultPaymentTerms: s.defaultPaymentTerms,
    defaultNotes: s.defaultNotes,
  };
}

export function SettingsForm({ initialSettings }: { initialSettings: SettingsRow }) {
  const [form, setForm] = useState<FormState>(toFormState(initialSettings));
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateSettings(form);
        toast.success("Settings saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save settings");
      }
    });
  }

  function handleReset() {
    if (!confirm("Reset all settings to defaults?")) return;
    setForm({
      companyName: "FocalDive (Pvt) Ltd",
      companyEmail: "devfocaldive@gmail.com",
      companyPhone: "",
      companyAddress: "Kurunegala, Sri Lanka",
      companyWebsite: "",
      invoicePrefix: "FD-INV",
      invoiceNumberDigits: 4,
      defaultCurrency: "LKR",
      defaultTaxPercentage: 0,
      defaultPaymentTerms: 14,
      defaultNotes: "Payment is due within 14 days. Bank details will be shared separately.",
    });
    toast.info("Settings reset to defaults. Click Save to apply.");
  }

  return (
    <div className="space-y-10 ">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">Settings</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="h-9 rounded-full">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isPending} className="h-9 rounded-full">
            <Save className="mr-1.5 h-3.5 w-3.5" /> {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        <div>
          <h2 className="text-lg font-semibold">Company Details</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Your company information used on invoices and PDFs</p>
        </div>
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Company Name</Label>
              <Input
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={form.companyEmail}
                onChange={(e) => update("companyEmail", e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Phone</Label>
              <Input
                value={form.companyPhone}
                onChange={(e) => update("companyPhone", e.target.value)}
                placeholder="+94 77 123 4567"
                className="mt-1.5 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Website</Label>
              <Input
                value={form.companyWebsite}
                onChange={(e) => update("companyWebsite", e.target.value)}
                placeholder="https://focaldive.com"
                className="mt-1.5"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Address</Label>
            <Textarea
              value={form.companyAddress}
              onChange={(e) => update("companyAddress", e.target.value)}
              rows={2}
              className="mt-1.5"
            />
          </div>
        </div>
      </section>

      <div className="border-t border-border" />

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        <div>
          <h2 className="text-lg font-semibold">Invoice Configuration</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Customize invoice numbering and default values</p>
        </div>
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Invoice Prefix</Label>
              <Input
                value={form.invoicePrefix}
                onChange={(e) => update("invoicePrefix", e.target.value)}
                className="mt-1.5 font-mono"
                placeholder="FD"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Format: <span className="font-mono font-medium text-foreground">{form.invoicePrefix}-ABBR-YYMM-{String(1).padStart(form.invoiceNumberDigits, "0")}</span>
              </p>
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Number Digits</Label>
              <Select
                value={String(form.invoiceNumberDigits)}
                onValueChange={(v) => update("invoiceNumberDigits", parseInt(v))}
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
                value={form.defaultCurrency}
                onValueChange={(v) => update("defaultCurrency", v)}
              >
                <SelectTrigger className="mt-1.5 font-mono"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Default Tax %</Label>
              <Input
                type="number"
                value={form.defaultTaxPercentage}
                onChange={(e) => update("defaultTaxPercentage", parseFloat(e.target.value) || 0)}
                className="mt-1.5 font-mono"
                min={0}
                max={100}
              />
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Payment Terms (days)</Label>
              <Input
                type="number"
                value={form.defaultPaymentTerms}
                onChange={(e) => update("defaultPaymentTerms", parseInt(e.target.value) || 14)}
                className="mt-1.5 font-mono"
                min={1}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Default Invoice Notes</Label>
            <Textarea
              value={form.defaultNotes}
              onChange={(e) => update("defaultNotes", e.target.value)}
              rows={3}
              className="mt-1.5 text-sm"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
