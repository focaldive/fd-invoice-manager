# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FocalDive Invoice Manager — an internal invoice management system for FocalDive (Pvt) Ltd, a Sri Lanka-based company. Built with Next.js 15 (App Router), self-hosted Postgres + Drizzle ORM, and shadcn/ui.

## Commands

- **Dev server:** `npm run dev` (uses Turbopack)
- **Build:** `npm run build`
- **Lint:** `npm run lint` (ESLint 9 flat config)
- **DB schema generate:** `npm run db:generate` (drizzle-kit generate)
- **DB migrate:** `npm run db:migrate` (drizzle-kit migrate)
- **DB push (dev only):** `npm run db:push`
- **DB studio:** `npm run db:studio`
- **Seed:** `npm run db:seed`
- **No test suite is configured.**

## Environment Variables

Server-only (never exposed to the client):
- `DATABASE_URL` — Postgres connection string (e.g. `postgresql://admin:fd1234@localhost:5432/fd_invoice`)
- `SESSION_SECRET` — HS256 signing key for the session JWT
- `SESSION_COOKIE_NAME` — defaults to `fd_session`
- `AUTH_USERNAME` / `AUTH_PASSWORD` — single-user credentials checked by `/api/auth/login`
- `RESEND_API_KEY` — Resend (email)
- `WHAPI_API_TOKEN` — Whapi.cloud (WhatsApp via `https://gate.whapi.cloud`)

There are no `NEXT_PUBLIC_*` vars — nothing should ship to the client bundle.

## Architecture

### Tech Stack
- Next.js 15.5 with App Router, React 19, TypeScript (strict mode)
- Drizzle ORM (`drizzle-orm` + `drizzle-kit`) over `pg` (node-postgres)
- React Server Components for reads; Server Actions (`'use server'`) for writes
- Route Handlers under `src/app/api/` for outbound integrations (Resend, Whapi) and the auth login/logout endpoints
- Tailwind CSS v4 (CSS-first config in `globals.css`), shadcn/ui (new-york style)
- jsPDF + jspdf-autotable for invoice PDF generation
- `jose` for HS256 JWT cookie sessions

### Path Alias
`@/*` maps to `./src/*`

### Source Layout
- `src/app/` — App Router. Pages are RSCs that call into `src/server/queries/`; mutations route through Server Actions in `src/server/actions/`. The only client components are interactive widgets under `src/components/` and the login page form.
  - `/login` — Username/password login form (POSTs to `/api/auth/login`)
  - `/` — Dashboard with revenue metrics and charts
  - `/invoices/` — List, create (`/new`), view (`/[id]`), edit (`/[id]/edit`)
  - `/clients/` — List and detail (`/[id]`)
  - `/recurring` — Manage recurring invoice templates
  - `/settings/` — Company and invoice configuration
  - `/api/auth/login` — POST `{ username, password }` → sets HttpOnly session cookie or 401
  - `/api/auth/logout` — POST → clears the session cookie
  - `/api/invoices/[id]/send-email` — POST: fetches invoice via Drizzle, generates PDF, sends via Resend, logs to `invoice_delivery_log`, sets `sent_on_email = true` and flips `draft → sent`. Calls `requireSession()`.
  - `/api/invoices/[id]/send-whatsapp` — POST: same flow via Whapi.cloud `/messages/document`; normalizes phone via `src/lib/phone.ts`, sets `sent_on_whatsapp = true`. Calls `requireSession()`.
  - `/api/invoices/[id]/delivery-logs` — GET: lists delivery attempts. Calls `requireSession()`.
- `src/server/` — server-only. Never import from `"use client"` files.
  - `db/client.ts` — node-postgres pool + Drizzle instance
  - `db/schema/` — one file per table; aggregated by `db/schema/index.ts`
  - `db/relations.ts` — Drizzle relations
  - `db/seed.ts` — seed script run by `npm run db:seed`
  - `queries/` — read functions (`clients`, `invoices`, `invoice-items`, `payments`, `recurring-invoices`, `recurring-invoice-items`, `settings`, `delivery-logs`)
  - `actions/` — `'use server'` write functions (`clients`, `invoices`, `payments`, `recurring`, `settings`)
  - `auth/session.ts` — `createSession`, `clearSession`, `getSession`, `requireSession` (jose JWT in HttpOnly cookie)
  - `auth/credentials.ts` — constant-time username/password compare against env
  - `integrations/resend.ts`, `integrations/whapi.ts` — outbound delivery clients
  - `invoice-numbering.ts` — sequence/abbreviation logic for invoice numbers
- `src/components/` — App components plus `ui/` directory with shadcn/ui primitives
  - `app-shell.tsx` — Layout wrapper with top nav and logout button (POSTs to `/api/auth/logout`). No client-side auth gate — middleware handles that.
  - `invoice-form.tsx` — Shared create/edit form
- `src/lib/` — browser-safe only. No DB clients, no server secrets.
  - `types.ts` — Domain DTOs (`Client`, `Invoice`, `InvoiceItem`, `Payment`, `RecurringInvoice`, `RecurringInvoiceItem`, `Settings`), constants (`CATEGORIES`, `STATUSES`, `CURRENCIES`, `PAYMENT_METHODS`, `COMPANY`), and helpers (`formatCurrency`, `getClientAbbreviation`, `buildInvoiceNumber`, `computeNextGenerationDate`, `getStatusInfo`, `getCategoryLabel`)
  - `pdf.ts` — PDF invoice generation with jsPDF (callable from server)
  - `phone.ts` — `normalizePhoneForWhatsApp` (handles Sri Lankan `0…` → `94…` conversion) and `isValidWhatsAppNumber`
  - `navigation-guard.tsx` — `NavigationGuardProvider` / `useNavigationGuard` to block Link clicks when a form has unsaved changes; mounted in `src/app/layout.tsx`
  - `utils.ts` — `cn()` helper (clsx + tailwind-merge)
- `src/middleware.ts` — verifies the session cookie with jose; redirects to `/login` for pages, returns 401 for `/api/*`. Public paths: `/login`, `/api/auth/login`, `/api/auth/logout`.
- `src/hooks/` — Custom hooks (`use-mobile.ts`)
- `drizzle/` — generated migrations (append-only)
- `drizzle.config.ts` — at repo root
- `scripts/` — Build-time utilities (e.g. `gen-logo-base64.js` for embedding the logo into PDFs)

### Data Flow
- Pages are RSCs that call functions from `src/server/queries/` directly. No `useEffect` + client-side fetch pattern.
- Mutations call Server Actions exported from `src/server/actions/*` with the `'use server'` directive — these are the only way client components cross into the server.
- Outbound integrations (Resend, Whapi) live in route handlers under `src/app/api/invoices/[id]/`. They `requireSession()` for defense-in-depth on top of middleware.
- Secrets (`DATABASE_URL`, `RESEND_API_KEY`, `WHAPI_API_TOKEN`, `SESSION_SECRET`, `AUTH_*`) are read inside `src/server/` only and must never be imported from a `"use client"` file.

### Authentication
Cookie-session model via `jose` (HS256 JWT, `HttpOnly`, `SameSite=Lax`, `Secure` in production, 24h TTL). `POST /api/auth/login` validates env-backed credentials with a constant-time compare and calls `createSession`; `POST /api/auth/logout` calls `clearSession`. `src/middleware.ts` runs on every non-static request and either lets it through, redirects to `/login`, or 401s API routes. Server actions and the integration routes additionally call `requireSession()` for defense-in-depth.

### Database Tables
Drizzle schema lives in `src/server/db/schema/` (one file per table) with relations in `src/server/db/relations.ts`. Migrations are append-only files under `drizzle/`, applied with `npm run db:migrate`. `npm run db:studio` opens a GUI.

Tables: `clients`, `invoices`, `invoice_items`, `payments`, `settings`, `recurring_invoices`, `recurring_invoice_items`, `invoice_delivery_log`.

Relationships: invoices reference clients via `client_id`; `invoice_items` and `payments` reference invoices via `invoice_id`; `recurring_invoice_items` reference `recurring_invoices`; auto-generated invoices link back via `invoices.recurring_invoice_id` and `is_auto_generated`. `invoice_delivery_log` stores per-attempt rows with `channel` (`email` | `whatsapp`), `recipient`, `status`, `external_message_id`, `error_message`. DTOs consumed by client components are defined in `src/lib/types.ts`.

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
- `jose` for JWT signing/verification (chosen for edge-runtime compatibility in middleware)

### Build Notes
- `next.config.ts` ignores TypeScript and ESLint errors during builds — local `npm run lint` is the only check that flags them
- Turbopack is configured with a custom loader for `orchids-visual-edits` on JSX/TSX files, and `<VisualEditsMessenger />` is mounted in the root layout
- The build statically prerenders RSC pages, which means `DATABASE_URL` must point at a reachable Postgres during `npm run build` (or those pages will fail to prerender). For deployment, run migrations first, then build.
