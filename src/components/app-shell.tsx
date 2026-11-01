import { AppShellClient } from "@/components/app-shell-client"
import { getSession } from "@/server/auth/session"
import { getNavCounts } from "@/server/queries/nav"

/**
 * Server wrapper: loads sidebar badge counts + the signed-in user, then hands
 * off to the interactive client shell. Pages keep using <AppShell> unchanged.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const [counts, session] = await Promise.all([getNavCounts(), getSession()])

  return (
    <AppShellClient counts={counts} username={session?.username ?? "admin"}>
      {children}
    </AppShellClient>
  )
}
