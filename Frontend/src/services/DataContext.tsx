import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { ReactNode } from "react"
import { api, errorMessage } from "./api"
import { useAuth } from "./AuthContext"
import type {
  Branch,
  Halaqa,
  NotificationItem,
  Role,
  Sheikh,
  Student,
  User,
} from "@/types"

export type DataKey =
  | "students"
  | "branches"
  | "halaqat"
  | "sheikhs"
  | "roles"
  | "users"
  | "notifications"

const ALL_KEYS: DataKey[] = [
  "students",
  "branches",
  "halaqat",
  "sheikhs",
  "roles",
  "users",
  "notifications",
]

interface DataValue {
  students: Student[]
  branches: Branch[]
  halaqat: Halaqa[]
  sheikhs: Sheikh[]
  roles: Role[]
  users: User[]
  notifications: NotificationItem[]
  unreadCount: number
  /** true until the very first fetch after login has finished */
  loading: boolean
  errors: Partial<Record<DataKey, string>>
  refresh: (keys?: DataKey[]) => Promise<void>
  markNotificationRead: (item: NotificationItem) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
}

const DataContext = createContext<DataValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [halaqat, setHalaqat] = useState<Halaqa[]>([])
  const [sheikhs, setSheikhs] = useState<Sheikh[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<DataKey, string>>>({})

  const isCentral = Boolean(user?.isCentral)
  const userId = user?.id

  // keep the central flag in a ref so `refresh` stays stable
  const centralRef = useRef(isCentral)
  centralRef.current = isCentral

  const refresh = useCallback(async (keys: DataKey[] = ALL_KEYS) => {
    const jobs: Record<DataKey, () => Promise<void>> = {
      students: async () => setStudents(await api.getStudents()),
      branches: async () => setBranches(await api.getBranches()),
      halaqat: async () => setHalaqat(await api.getHalaqat()),
      sheikhs: async () => setSheikhs(await api.getSheikhs()),
      roles: async () => setRoles(await api.getRoles()),
      // /users is restricted to central admins by the backend
      users: async () => {
        if (centralRef.current) setUsers(await api.getUsers())
        else setUsers([])
      },
      notifications: async () => setNotifications(await api.getNotifications()),
    }

    const results = await Promise.allSettled(keys.map((key) => jobs[key]()))
    setErrors((prev) => {
      const next = { ...prev }
      results.forEach((result, index) => {
        const key = keys[index]
        if (result.status === "rejected") next[key] = errorMessage(result.reason)
        else delete next[key]
      })
      return next
    })
  }, [])

  // (Re)load everything whenever somebody signs in; clear everything on sign-out.
  useEffect(() => {
    if (!userId) {
      setStudents([])
      setBranches([])
      setHalaqat([])
      setSheikhs([])
      setRoles([])
      setUsers([])
      setNotifications([])
      setErrors({})
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    refresh().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [userId, refresh])

  // Pick up new notifications (e.g. "a student was added to your halaqa").
  useEffect(() => {
    if (!userId) return
    const timer = window.setInterval(() => void refresh(["notifications"]), 60_000)
    return () => window.clearInterval(timer)
  }, [userId, refresh])

  const markNotificationRead = useCallback(async (item: NotificationItem) => {
    if (item.read) return
    setNotifications((list) => list.map((n) => (n.id === item.id ? { ...n, read: true } : n)))
    try {
      await api.markNotificationAsRead(item.notificationId ?? item.id)
    } catch {
      // roll back if the server rejected it
      setNotifications((list) => list.map((n) => (n.id === item.id ? { ...n, read: false } : n)))
    }
  }, [])

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications((list) => list.map((n) => ({ ...n, read: true })))
    try {
      await api.markAllNotificationsAsRead()
    } catch {
      await refresh(["notifications"])
    }
  }, [refresh])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])

  const value = useMemo<DataValue>(
    () => ({
      students,
      branches,
      halaqat,
      sheikhs,
      roles,
      users,
      notifications,
      unreadCount,
      loading,
      errors,
      refresh,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [
      students,
      branches,
      halaqat,
      sheikhs,
      roles,
      users,
      notifications,
      unreadCount,
      loading,
      errors,
      refresh,
      markNotificationRead,
      markAllNotificationsRead,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error("useData must be used inside <DataProvider>")
  return ctx
}
