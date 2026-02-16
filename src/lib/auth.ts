const AUTH_KEY = "fd_auth"
const VALID_USERNAME = "focaldive"
const VALID_PASSWORD = "fd_2026"
const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface AuthToken {
  token: string
  expiresAt: number
}

export function login(username: string, password: string): boolean {
  if (username !== VALID_USERNAME || password !== VALID_PASSWORD) {
    return false
  }

  const authData: AuthToken = {
    token: crypto.randomUUID(),
    expiresAt: Date.now() + TTL_MS,
  }

  localStorage.setItem(AUTH_KEY, JSON.stringify(authData))
  return true
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY)
}

export function isAuthenticated(): boolean {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return false

    const data: AuthToken = JSON.parse(raw)
    if (data.expiresAt > Date.now()) {
      return true
    }

    // Token expired — clean up
    localStorage.removeItem(AUTH_KEY)
    return false
  } catch {
    localStorage.removeItem(AUTH_KEY)
    return false
  }
}
