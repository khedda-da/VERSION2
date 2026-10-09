import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { api, UNAUTHORIZED_EVENT } from "./api"
import type { AuthUser } from "@/types"

type AuthStatus = "loading" | "setup" | "anon" | "authed"

interface AuthValue {
  user: AuthUser | null
  status: AuthStatus
  login: (username: string, password: string) => Promise<void>
  setup: (input: {
    fullName: string
    username: string
    password: string
    email?: string
    phone?: string
  }) => Promise<void>
  logout: () => void
  /** Replace the cached user (e.g. after the profile was edited). */
  setUser: (user: AuthUser | null) => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>("loading")

  // Restore the session from the stored token on first load.
  useEffect(() => {
    let cancelled = false
    const resolveAnon = () =>
      api
        .getSetupStatus()
        .then((needsSetup) => !cancelled && setStatus(needsSetup ? "setup" : "anon"))
        .catch(() => !cancelled && setStatus("anon"))

    if (!api.hasToken()) {
      void resolveAnon()
      return () => {
        cancelled = true
      }
    }
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
        void resolveAnon()
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

  const setup = useCallback(
    async (input: {
      fullName: string
      username: string
      password: string
      email?: string
      phone?: string
    }) => {
      const me = await api.setupFirstUser(input)
      setUser(me)
      setStatus("authed")
    },
    [],
  )

  const logout = useCallback(() => {
    api.logout()
    setUser(null)
    setStatus("anon")
  }, [])

  const value = useMemo(
    () => ({ user, status, login, setup, logout, setUser }),
    [user, status, login, setup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
