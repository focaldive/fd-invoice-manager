"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Repeat,
  Building2,
  ReceiptText,
  Users,
  Settings,
  LogOut,
  Plus,
  ChevronDown,
} from "lucide-react"
import { FocalDiveLogo } from "@/components/logo"
import { useNavigationGuard } from "@/lib/navigation-guard"
import { cn } from "@/lib/utils"
import type { NavCounts } from "@/server/queries/nav"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ─────────────────────────────────────────────────────────────
// Navigation model
// ─────────────────────────────────────────────────────────────

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  count?: keyof NavCounts
}

type NavSection = { title?: string; items: NavItem[] }

const SECTIONS: NavSection[] = [
  {
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Billing",
    items: [
      { href: "/invoices", label: "Invoices", icon: FileText, count: "invoices" },
      { href: "/receipts", label: "Receipts", icon: Receipt, count: "receipts" },
      { href: "/recurring", label: "Recurring", icon: Repeat },
      { href: "/clients", label: "Clients", icon: Building2, count: "clients" },
    ],
  },
  {
    title: "Payroll",
    items: [
      { href: "/payslips", label: "Payslips", icon: ReceiptText },
      { href: "/employees", label: "Employees", icon: Users },
    ],
  },
]

const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", icon: Settings }

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
}

/** Active nav item + the section it belongs to (drives header title & tabs). */
function resolveRoute(pathname: string) {
  for (const section of SECTIONS) {
    const item = section.items.find((i) => isActive(pathname, i.href))
    if (item) return { section, item }
  }
  if (isActive(pathname, SETTINGS_ITEM.href)) return { section: undefined, item: SETTINGS_ITEM }
  return { section: undefined, item: undefined }
}

// ─────────────────────────────────────────────────────────────
// Shell
// ─────────────────────────────────────────────────────────────

export function AppShellClient({
  children,
  counts,
  username,
}: {
  children: React.ReactNode
  counts: NavCounts
  username: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { tryNavigate } = useNavigationGuard()
  const { section, item: activeItem } = resolveRoute(pathname)

  function handleNavClick(e: React.MouseEvent, href: string) {
    // If a guard is registered (unsaved form) and it blocks, cancel the Link navigation
    if (tryNavigate(href)) e.preventDefault()
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.replace("/login")
  }

  return (
    <SidebarProvider
      className="h-dvh overflow-hidden"
      style={{ "--sidebar-width": "254px" } as React.CSSProperties}
    >
      <Sidebar collapsible="icon" className="border-sidebar-border">
        {/* Brand block */}
        {/* h-14 (56px incl. border) — must match the top header so the bottom borders line up */}
        <SidebarHeader className="border-sidebar-border bg-sidebar-accent h-14 shrink-0 justify-center border-b px-3 py-0 group-data-[collapsible=icon]:px-2">
          <Link
            href="/"
            onClick={(e) => handleNavClick(e, "/")}
            className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:justify-center"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#0e0e0e] shadow-raised">
              <FocalDiveLogo size={20} />
            </span>
            <span className="truncate text-[15px] font-medium tracking-[-0.01em] text-foreground group-data-[collapsible=icon]:hidden">
              FocalDive
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="gap-0">
          <nav aria-label="Primary">
            {SECTIONS.map((s, idx) => (
              <NavSectionBlock key={s.title ?? idx} title={s.title}>
                {s.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={activeItem?.href === item.href}
                    count={item.count ? counts[item.count] : undefined}
                    onClick={handleNavClick}
                  />
                ))}
              </NavSectionBlock>
            ))}
          </nav>
        </SidebarContent>

        <SidebarFooter className="gap-0 p-0">
          <NavSectionBlock className="border-sidebar-border border-t border-b-0">
            <NavLink
              item={SETTINGS_ITEM}
              active={activeItem?.href === SETTINGS_ITEM.href}
              onClick={handleNavClick}
              quiet
            />
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
                tooltip="Log out"
                className={navButtonClass(false, true)}
              >
                <LogOut className="text-subtle size-4!" />
                <span>Log out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </NavSectionBlock>

          {/* Summary card — mirrors the "trial / billing" card of the reference layout */}
          <div className="border-sidebar-border bg-sidebar-accent flex items-center justify-between gap-2 border-t p-4 group-data-[collapsible=icon]:hidden">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[15px] font-medium tracking-[-0.01em] text-foreground">
                {counts.unpaid} unpaid
              </span>
              <span className="truncate text-[11px] text-subtle">Awaiting payment</span>
            </div>
            <Link
              href="/invoices/new"
              onClick={(e) => handleNavClick(e, "/invoices/new")}
              className="bg-muted text-foreground shadow-raised inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium transition-colors hover:bg-[#333333]"
            >
              <Plus className="size-3.5" />
              New invoice
            </Link>
          </div>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 overflow-hidden">
        {/* h-14 (56px incl. border) — matches the sidebar brand block */}
        <header className="border-border h-14 shrink-0 border-b">
          <div className="flex h-full items-center justify-between gap-2 px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <SidebarTrigger className="bg-secondary shadow-raised size-[30px] rounded-lg hover:bg-muted" />
              <div className="flex min-w-0 items-center gap-1.5 text-[15px] tracking-[-0.01em]">
                {section?.title && (
                  <>
                    <span className="text-subtle hidden sm:inline">{section.title}</span>
                    <span className="text-faint hidden sm:inline">/</span>
                  </>
                )}
                <span className="truncate font-medium">{activeItem?.label ?? "FocalDive"}</span>
              </div>
              {section?.title === "Billing" && counts.unpaid > 0 && (
                <span className="bg-muted hidden shrink-0 items-center gap-1 rounded-full border border-[#363636] py-[3px] pr-2 pl-[5px] text-[11px] text-chip sm:inline-flex">
                  <span className="size-1.5 rounded-full bg-amber-400" />
                  {counts.unpaid} awaiting payment
                </span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger className="bg-secondary shadow-raised flex h-[30px] items-center gap-1.5 rounded-lg py-[5px] pr-2 pl-[5px] text-[12px] outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-md text-[11px] font-semibold uppercase">
                    {username.charAt(0)}
                  </span>
                  <span className="hidden sm:inline">{username}</span>
                  <ChevronDown className="text-subtle size-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    Signed in as <span className="text-foreground">{username}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" onClick={(e) => handleNavClick(e, "/settings")}>
                      <Settings className="mr-2 size-3.5" /> Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 size-3.5" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] p-6">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

// ─────────────────────────────────────────────────────────────
// Pieces
// ─────────────────────────────────────────────────────────────

function navButtonClass(active: boolean, quiet = false) {
  return cn(
    "h-9 gap-2.5 rounded-lg px-2.5 text-[14px] font-normal",
    "text-sidebar-foreground hover:bg-transparent hover:text-foreground active:bg-transparent",
    "data-[active=true]:bg-sidebar-primary data-[active=true]:font-normal data-[active=true]:text-foreground data-[active=true]:shadow-raised",
    // Icon-only (collapsed) mode: drop label/badge + gap so the icon is truly centred
    "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:[&>span]:hidden",
    quiet && "text-subtle",
    active && "mb-0.5",
  )
}

function NavSectionBlock({
  title,
  children,
  className,
}: {
  title?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "border-sidebar-border flex flex-col gap-1 border-b p-3",
        // Collapsed: 48px rail − 2×8px padding = 32px button, centred under the logo
        "group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2",
        className,
      )}
    >
      {title && (
        <span className="text-faint px-2 text-[11px] font-medium tracking-wide uppercase group-data-[collapsible=icon]:hidden">
          {title}
        </span>
      )}
      <SidebarMenu className="gap-0 group-data-[collapsible=icon]:items-center">{children}</SidebarMenu>
    </div>
  )
}

function NavLink({
  item,
  active,
  count,
  quiet,
  onClick,
}: {
  item: NavItem
  active: boolean
  count?: number
  quiet?: boolean
  onClick: (e: React.MouseEvent, href: string) => void
}) {
  const Icon = item.icon
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={item.label} className={navButtonClass(active, quiet)}>
        <Link href={item.href} onClick={(e) => onClick(e, item.href)} aria-current={active ? "page" : undefined}>
          <Icon
            className={cn(
              "size-4! shrink-0 transition-colors",
              active ? "text-icon" : "text-subtle group-hover/menu-item:text-icon",
            )}
          />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {count !== undefined && (
            <span className="bg-muted text-chip inline-flex h-[18px] min-w-6 shrink-0 items-center justify-center rounded-full border-[0.5px] border-[#414141] px-1.5 text-[11px] tabular-nums shadow-[0px_0px_0px_0.5px_#0e0e0e] group-data-[collapsible=icon]:hidden">
              {count}
            </span>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
