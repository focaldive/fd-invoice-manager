"use client"

import { createContext, useContext, useRef, useCallback } from "react"

type GuardFn = (href: string) => boolean

interface NavigationGuardContextType {
  registerGuard: (guard: GuardFn) => void
  unregisterGuard: () => void
  tryNavigate: (href: string) => boolean
}

const NavigationGuardContext = createContext<NavigationGuardContextType>({
  registerGuard: () => {},
  unregisterGuard: () => {},
  tryNavigate: () => true,
})

export function NavigationGuardProvider({ children }: { children: React.ReactNode }) {
  const guardRef = useRef<GuardFn | null>(null)

  const registerGuard = useCallback((guard: GuardFn) => {
    guardRef.current = guard
  }, [])

  const unregisterGuard = useCallback(() => {
    guardRef.current = null
  }, [])

  const tryNavigate = useCallback((href: string): boolean => {
    if (guardRef.current) {
      // Returns true if navigation is blocked (guard intercepted it)
      return guardRef.current(href)
    }
    return false
  }, [])

  return (
    <NavigationGuardContext.Provider value={{ registerGuard, unregisterGuard, tryNavigate }}>
      {children}
    </NavigationGuardContext.Provider>
  )
}

export function useNavigationGuard() {
  return useContext(NavigationGuardContext)
}
