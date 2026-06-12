"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  Repeat,
  Building2,
  ReceiptText,
  Users,
  Settings,
  LogOut,
} from "lucide-react"
import { FocalDiveLogo } from "@/components/logo"
import { useNavigationGuard } from "@/lib/navigation-guard"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/payslips", label: "Payslips", icon: ReceiptText },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { tryNavigate } = useNavigationGuard()

  function handleNavClick(e: React.MouseEvent, href: string) {
    // If a guard is registered and it blocks, prevent default Link navigation
    if (tryNavigate(href)) {
      e.preventDefault()
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.replace("/login")
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" tooltip="FocalDive" className="group-data-[collapsible=icon]:justify-center">

                <Link href="/" onClick={(e) => handleNavClick(e, "/")}>
                  <FocalDiveLogo size={24} />
                  <div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
                    <span className="text-[15px] font-semibold tracking-tight">FocalDive</span>
                    <span className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mt-0.5">
                      Invoice Manager
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="px-1 py-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {navItems.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href)
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className="h-10 gap-3 px-3 text-[15px] group-data-[collapsible=icon]:px-2!"
                      >
                        <Link href={item.href} onClick={(e) => handleNavClick(e, item.href)}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="px-1 pb-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
                tooltip="Logout"
                className="h-10 gap-3 px-3 text-[15px] group-data-[collapsible=icon]:px-2!"
              >
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        {/* Top bar with sidebar toggle */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <SidebarTrigger className="-ml-1.5" />
        </header>

        {/* Main content */}
        <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
