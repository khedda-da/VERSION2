import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { api, UNAUTHORIZED_EVENT } from "./api"
import type { AuthUser } from "@/types"

type AuthStatus = "loading" | "anon" | "authed"

interface AuthValue {
  user: AuthUser | null
  status: AuthStatus
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  /** Replace the cached user (e.g. after the profile was edited). */
  setUser: (user: AuthUser | null) => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>(api.hasToken() ? "loading" : "anon")

  // Restore the session from the stored token on first load.
  useEffect(() => {
    if (!api.hasToken()) return
    let cancelled = false
    api
      .getMe()
      .then((me) => {
        if (cancelled) return
        setUser(me)
        setStatus("authed")
      })
      .catch(() => {
        if (cancelled) return
        api.logout()
        setUser(null)
        setStatus("anon")
      })
    return () => {
      cancelled = true
    }
  }, [])

  // The API client fires this when any request comes back 401 (expired token).
  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null)
      setStatus("anon")
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const me = await api.login(username, password)
    setUser(me)
    setStatus("authed")
  }, [])

  const logout = useCallback(() => {
    api.logout()
    setUser(null)
    setStatus("anon")
  }, [])

  const value = useMemo(
    () => ({ user, status, login, logout, setUser }),
    [user, status, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
