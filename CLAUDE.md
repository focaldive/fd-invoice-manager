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

Requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Supabase connectivity.

## Architecture

### Tech Stack
- Next.js 15.5 with App Router, React 19, TypeScript (strict mode)
- Supabase client-side SDK for all data operations (no API routes)
- Tailwind CSS v4 (CSS-first config in `globals.css`), shadcn/ui (new-york style)
- jsPDF for invoice PDF generation

### Path Alias
`@/*` maps to `./src/*`

### Source Layout
- `src/app/` — Pages using App Router. All pages are client components (`"use client"`).
  - `/` — Dashboard with revenue metrics and charts
  - `/invoices/` — List, create (`/new`), view (`/[id]`), edit (`/[id]/edit`)
  - `/clients/` — List and detail (`/[id]`)
  - `/settings/` — Company and invoice configuration
- `src/components/` — App components (`app-shell.tsx` layout wrapper, `invoice-form.tsx`, `logo.tsx`, `theme-provider.tsx`) plus `ui/` directory with ~63 shadcn/ui primitives
- `src/lib/` — Shared logic
  - `supabase.ts` — Single Supabase client instance
  - `types.ts` — All TypeScript interfaces, constants (`CATEGORIES`, `STATUSES`, `PAYMENT_METHODS`, `COMPANY`), and utility functions (`formatCurrency`, `getClientAbbreviation`, `buildInvoiceNumber`)
  - `pdf.ts` — PDF invoice generation with jsPDF
  - `utils.ts` — `cn()` helper (clsx + tailwind-merge)
- `src/hooks/` — Custom hooks (`use-mobile.ts`)

### Data Flow
All data fetching and mutations happen directly from client components via the Supabase JS SDK. There are no server components, API routes, or server actions. Components fetch data in `useEffect` and mutate with direct Supabase calls, then refetch to sync state.

### Database Tables
Five Supabase tables: `clients`, `invoices`, `invoice_items`, `payments`, `settings`. Relationships: invoices reference clients via `client_id`; invoice_items and payments reference invoices via `invoice_id`. Types are defined in `src/lib/types.ts`.

### Invoice Number Format
`FD-{CLIENT_ABBR}-{YYMM}-{SEQ}` (e.g., `FD-ZZCW-2601-001`). Client abbreviation is auto-generated from company name initials (max 4 chars, excluding words like Pvt/Ltd). Sequence increments per client per month.

### Styling
Dark theme by default. Custom fonts: Space Grotesk (sans) and JetBrains Mono (mono). Primary accent color: `#09c880`. Theme variables defined in `src/app/globals.css`. Uses `next-themes` for theme switching.

### Key Libraries
- `react-hook-form` + `zod` for form validation (available but most forms use manual state)
- `recharts` for dashboard charts
- `sonner` for toast notifications
- `framer-motion` for animations
- `date-fns` + `react-day-picker` for date handling
- `lucide-react` for icons

### Build Notes
- `next.config.ts` ignores TypeScript and ESLint errors during builds
- Turbopack configured with a custom loader for `orchids-visual-edits` on JSX/TSX files
- Currencies supported: LKR (Sri Lankan Rupee) and USD
