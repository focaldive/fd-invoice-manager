"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Search, Menu, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { FocalDiveLogo } from "@/components/logo"

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/invoices", label: "Invoices" },
  { href: "/settings", label: "Settings" },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1400px] flex h-16 items-center justify-between px-6">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <FocalDiveLogo size={32} />
            <div className="flex flex-col">
              <span className="text-[15px] font-bold tracking-tight leading-none">FocalDive</span>
              <span className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mt-0.5">Invoice Manager</span>
            </div>
          </Link>

          {/* Center: Search (hidden on mobile) */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search"
                className="pl-9 h-9 text-sm bg-secondary border-border rounded-full"
              />
            </div>
          </div>

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
          <div className="md:hidden border-t border-border px-6 py-4 space-y-1 bg-background">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
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
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-[1400px] px-6 py-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="mx-auto max-w-[1400px] px-6 py-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-sm font-semibold">FocalDive</p>
            <p className="text-xs text-muted-foreground mt-0.5">Invoice Manager for FocalDive (Pvt) Ltd</p>
          </div>
          <p className="text-xs text-muted-foreground">&copy;{new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  )
}
