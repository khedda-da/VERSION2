import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { api, UNAUTHORIZED_EVENT } from "./api"
import type { AuthUser } from "@/types"

/** "anon" = the login screen; "setup" and "register" are the other signed-out screens. */
type AuthStatus = "loading" | "setup" | "register" | "anon" | "authed"

interface SignupInput {
  fullName: string
  username: string
  password: string
  email?: string
  phone?: string
}

interface AuthValue {
  user: AuthUser | null
  status: AuthStatus
  /** null = the server could not be reached, so we don't know yet. */
  needsSetup: boolean | null
  registrationOpen: boolean | null
  /** One-off message for the login screen (e.g. "system already set up"). */
  notice: string
  login: (username: string, password: string) => Promise<void>
  setup: (input: SignupInput) => Promise<void>
  register: (input: SignupInput) => Promise<void>
  logout: () => void
  goToSetup: () => void
  goToRegister: () => void
  goToLogin: () => void
  /** Replace the cached user (e.g. after the profile was edited). */
  setUser: (user: AuthUser | null) => void
}

const AuthContext = createContext<AuthValue | null>(null)

const currentPath = () => window.location.pathname.replace(/\/+$/, "") || "/"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null)
  const [notice, setNotice] = useState("")

  // Restore the session from the stored token on first load.
  useEffect(() => {
    let cancelled = false
    const path = currentPath()

    // Decide which signed-out screen to show, from the server state + the URL.
    const resolveAnon = () =>
      api
        .getAuthStatus()
        .then((info) => {
          if (cancelled) return
          setNeedsSetup(info.needsSetup)
          setRegistrationOpen(info.registrationOpen)
          if (info.needsSetup) return setStatus("setup")
          if (path === "/setup") setNotice("تم إعداد النظام مسبقًا. سجّل الدخول أو أنشئ حسابًا جديدًا.")
          setStatus(path === "/register" && info.registrationOpen ? "register" : "anon")
        })
        .catch((err) => {
          console.warn("[Auth] Failed to reach /auth/setup-status:", err)
          if (cancelled) return
          // Server state unknown: honour the URL so these pages stay reachable.
          setStatus(path === "/setup" ? "setup" : path === "/register" ? "register" : "anon")
        })

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
      setStatus((s) => (s === "loading" ? s : "anon"))
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const me = await api.login(username, password)
    setUser(me)
    setStatus("authed")
  }, [])

  const setup = useCallback(async (input: SignupInput) => {
    const me = await api.setupFirstUser(input)
    setUser(me)
    setNeedsSetup(false)
    setStatus("authed")
  }, [])

  // Does not sign in: the new account waits for an admin to approve it.
  const register = useCallback(async (input: SignupInput) => {
    await api.register(input)
  }, [])

  const logout = useCallback(() => {
    api.logout()
    setUser(null)
    setStatus("anon")
  }, [])

  const goToSetup = useCallback(() => {
    setNotice("")
    setStatus("setup")
  }, [])
  const goToRegister = useCallback(() => {
    setNotice("")
    setStatus("register")
  }, [])
  const goToLogin = useCallback(() => {
    setNotice("")
    setStatus("anon")
  }, [])

  const value = useMemo(
    () => ({
      user,
      status,
      needsSetup,
      registrationOpen,
      notice,
      login,
      setup,
      register,
      logout,
      goToSetup,
      goToRegister,
      goToLogin,
      setUser,
    }),
    [user, status, needsSetup, registrationOpen, notice, login, setup, register, logout, goToSetup, goToRegister, goToLogin],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
