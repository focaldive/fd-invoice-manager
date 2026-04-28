# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FocalDive Invoice Manager — an internal invoice management system for FocalDive (Pvt) Ltd, a Sri Lanka-based company. Built with Next.js 15 (App Router), Supabase (PostgreSQL), and shadcn/ui.

## Commands

- **Dev server:** `npm run dev` (uses Turbopack)
- **Build:** `npm run build`
- **Lint:** `npm run lint` (ESLint 9 flat config)
- **No test suite is configured.**

## Environment Variables

Client-side (Supabase SDK):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-side (used only by API routes under `src/app/api/`):
- `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS for server-side reads/writes during email and WhatsApp delivery
- `RESEND_API_KEY` — Resend (email)
- `WHAPI_API_TOKEN` — Whapi.cloud (WhatsApp via `https://gate.whapi.cloud`)

## Architecture

### Tech Stack
- Next.js 15.5 with App Router, React 19, TypeScript (strict mode)
- Supabase JS SDK for almost all data operations from client components
- A small set of Next.js Route Handlers under `src/app/api/` for outbound integrations that need server secrets (Resend, Whapi)
- Tailwind CSS v4 (CSS-first config in `globals.css`), shadcn/ui (new-york style)
- jsPDF + jspdf-autotable for invoice PDF generation

### Path Alias
`@/*` maps to `./src/*`

### Source Layout
- `src/app/` — App Router pages. UI pages are client components (`"use client"`); the API routes under `src/app/api/` are the only server code.
  - `/login` — Username/password login page (no AuthGuard wrapping)
  - `/` — Dashboard with revenue metrics and charts
  - `/invoices/` — List, create (`/new`), view (`/[id]`), edit (`/[id]/edit`)
  - `/clients/` — List and detail (`/[id]`)
  - `/recurring` — Manage recurring invoice templates
  - `/settings/` — Company and invoice configuration
  - `/api/send-email` — POST `{ invoiceId }`: fetches invoice + items + settings (service-role), generates PDF, sends via Resend, logs to `invoice_delivery_log`, sets `sent_on_email = true` and flips `draft → sent`
  - `/api/send-whatsapp` — POST `{ invoiceId }`: same flow via Whapi.cloud `/messages/document`; normalizes phone via `src/lib/phone.ts`, sets `sent_on_whatsapp = true`
  - `/api/delivery-logs` — GET `?invoiceId=…`: lists delivery attempts for an invoice
- `src/components/` — App components plus `ui/` directory with shadcn/ui primitives
  - `app-shell.tsx` — Layout wrapper, top nav, wraps children in `AuthGuard`
  - `auth-guard.tsx` — Redirects to `/login` if not authenticated (client-side check)
  - `invoice-form.tsx` — Shared create/edit form
- `src/lib/` — Shared logic
  - `supabase.ts` — Single browser Supabase client instance (anon key)
  - `auth.ts` — Hardcoded-credential auth (see "Authentication" below)
  - `types.ts` — Domain interfaces (`Client`, `Invoice`, `InvoiceItem`, `Payment`, `RecurringInvoice`, `RecurringInvoiceItem`, `Settings`), constants (`CATEGORIES`, `STATUSES`, `CURRENCIES`, `PAYMENT_METHODS`, `COMPANY`), and helpers (`formatCurrency`, `getClientAbbreviation`, `buildInvoiceNumber`, `computeNextGenerationDate`, `getStatusInfo`, `getCategoryLabel`)
  - `pdf.ts` — PDF invoice generation with jsPDF
  - `phone.ts` — `normalizePhoneForWhatsApp` (handles Sri Lankan `0…` → `94…` conversion) and `isValidWhatsAppNumber`
  - `navigation-guard.tsx` — `NavigationGuardProvider` / `useNavigationGuard` to block Link clicks when a form has unsaved changes; mounted in `src/app/layout.tsx`
  - `utils.ts` — `cn()` helper (clsx + tailwind-merge)
- `src/hooks/` — Custom hooks (`use-mobile.ts`)
- `sql/` — One-off migrations to run manually in the Supabase SQL editor (e.g. `recurring-invoices-migration.sql`)
- `scripts/` — Build-time utilities (e.g. `gen-logo-base64.js` for embedding the logo into PDFs)

### Data Flow
- UI pages fetch and mutate Supabase directly with the anon-key client; they `useEffect` to load and refetch after writes to sync state.
- The three `/api/*` routes are the only server-side code path. They construct a service-role Supabase client at module scope and are the only place secrets are touched. Don't move email/WhatsApp logic back into the browser — the Resend/Whapi keys must not ship to the client.

### Authentication
Single hardcoded credential pair in `src/lib/auth.ts` (`focaldive` / `fd_2026`). On successful login a random UUID and 24-hour expiry are stored in `localStorage` under key `fd_auth`. `AuthGuard` (used by `AppShell`) redirects unauthenticated users to `/login`. There is no server-side session check — the API routes are not protected by this auth, so don't rely on it for authorization of sensitive operations.

### Database Tables
Supabase tables: `clients`, `invoices`, `invoice_items`, `payments`, `settings`, `recurring_invoices`, `recurring_invoice_items`, `invoice_delivery_log`.

Relationships: invoices reference clients via `client_id`; `invoice_items` and `payments` reference invoices via `invoice_id`; `recurring_invoice_items` reference `recurring_invoices`; auto-generated invoices link back via `invoices.recurring_invoice_id` and `is_auto_generated`. `invoice_delivery_log` stores per-attempt rows with `channel` (`email` | `whatsapp`), `recipient`, `status`, `external_message_id`, `error_message`. Types are defined in `src/lib/types.ts`.

The delivery API routes wrap `invoice_delivery_log` inserts in a try/catch that logs a warning if the table doesn't exist, so delivery still works in environments where that table hasn't been migrated yet.

### Invoice Number Format
`FD-{CLIENT_ABBR}-{YYMM}-{SEQ}` (e.g., `FD-ZZCW-2601-001`). Client abbreviation is auto-generated by `getClientAbbreviation`: first letter of each word of the company name, max 4 chars, excluding `pvt`, `ltd`, `inc`, `llc`, `co`, `the`, `and`, `of`. Single-word names take the first 4 letters. Sequence increments per client per month.

### Recurring Invoices
A `RecurringInvoice` is a template with `day_of_month` (1–28) and `next_generation_date`. `computeNextGenerationDate(dayOfMonth)` advances to next month if today is past the day. Generation itself is not yet automated server-side — the `/recurring` UI manages templates and `auto_send_whatsapp` is a flag on the template. Generated invoices are linked via `recurring_invoice_id` and flagged with `is_auto_generated = true`.

### Styling
Dark theme by default. Fonts: **Switzer** (local variable woff2 at `src/app/fonts/Switzer-Variable.woff2`, var `--font-switzer`) and **JetBrains Mono** (var `--font-jetbrains-mono`). Primary accent color: `#09c880`. Theme variables live in `src/app/globals.css`. `next-themes` is available for theme switching.

### Currencies
`CURRENCIES` in `src/lib/types.ts`: LKR, USD, AED, QAR, SAR, GBP, EUR, AUD, INR, SGD. `formatCurrency` renders symbol-before for `$ £ € ₹` and any `$`-suffixed code (A$, S$); everything else gets `CODE 1,234.56` form.

### Key Libraries
- `react-hook-form` + `zod` are installed but most forms use manual `useState`
- `recharts` for dashboard charts
- `sonner` for toast notifications
- `framer-motion` for animations
- `date-fns` + `react-day-picker` for date handling
- `lucide-react` for icons
- `resend` for email; Whapi.cloud is called via `fetch` directly

### Build Notes
- `next.config.ts` ignores TypeScript and ESLint errors during builds — local `npm run lint` is the only check that flags them
- Turbopack is configured with a custom loader for `orchids-visual-edits` on JSX/TSX files, and `<VisualEditsMessenger />` is mounted in the root layout
