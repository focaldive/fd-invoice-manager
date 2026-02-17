"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Menu, X, LogOut } from "lucide-react"
import { useState } from "react"
import { FocalDiveLogo } from "@/components/logo"
import { useNavigationGuard } from "@/lib/navigation-guard"
import { AuthGuard } from "@/components/auth-guard"
import { logout } from "@/lib/auth"

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/invoices", label: "Invoices" },
  { href: "/recurring", label: "Recurring" },
  { href: "/clients", label: "Clients" },
  { href: "/settings", label: "Settings" },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { tryNavigate } = useNavigationGuard()
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleNavClick(e: React.MouseEvent, href: string) {
    // If a guard is registered and it blocks, prevent default Link navigation
    if (tryNavigate(href)) {
      e.preventDefault()
    }
  }

  function handleLogout() {
    logout()
    router.replace("/login")
  }

  return (
    <AuthGuard>
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1400px] flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Left: Logo */}
          <Link href="/" onClick={(e) => handleNavClick(e, "/")} className="flex items-center gap-3 shrink-0">
            <FocalDiveLogo size={32} />
            <div className="flex flex-col">
              <span className="text-[15px] font-semibold tracking-tight leading-none">FocalDive</span>
              <span className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mt-0.5">Invoice Manager</span>
            </div>
          </Link>

          {/* Right: Nav links (desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-full transition-colors",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
            <button
              onClick={handleLogout}
              className="ml-2 p-2 text-muted-foreground hover:text-foreground rounded-full transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border px-4 sm:px-6 py-4 space-y-1 bg-background">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => { handleNavClick(e, item.href); setMobileOpen(false) }}
                  className={cn(
                    "block px-4 py-2.5 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
    </AuthGuard>
  )
}
