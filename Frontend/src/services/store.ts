import { initialStudents, initialNotifications } from "./mockData"
import type { Student, NotificationItem } from "@/types"

// In-memory data store with state observers
let students: Student[] = [...initialStudents]
let notifications: NotificationItem[] = [...initialNotifications]

type Listener = () => void
const studentListeners = new Set<Listener>()
const notificationListeners = new Set<Listener>()

export const studentStore = {
  getAll: (): Student[] => [...students],
  getById: (id: string): Student | undefined => students.find((s) => s.id === id),
  add: (data: Partial<Student> & { name: string }): Student => {
    const id = `DJ-${1043 + students.length}`
    const parts = data.name.trim().split(" ")
    const initials = parts.length > 1 ? `${parts[0][0]} ${parts[1][0]}` : parts[0].slice(0, 2)
    const newStudent: Student = {
      id,
      name: data.name,
      initials,
      age: data.age || 15,
      school: data.school || "ثانوية ابن خلدون",
      level: data.level || "ثانوي",
      branch: data.branch || "المقر الثاني",
      halaqa: data.halaqa || "حلقة الإمام مالك",
      sheikh: data.sheikh || "الشيخ أحمد",
      date: "اليوم",
      status: data.status || "نشط",
      phone: data.phone || "0550 00 00 00",
      email: data.email || "student@djam3ya.dz",
      birthDate: data.birthDate || "2010-01-01",
      gender: data.gender || "ذكر",
    }
    students = [newStudent, ...students]
    studentListeners.forEach((fn) => fn())
    return newStudent
  },
  update: (id: string, updates: Partial<Student>): Student | undefined => {
    const index = students.findIndex((s) => s.id === id)
    if (index === -1) return undefined
    students[index] = { ...students[index], ...updates }
    students = [...students]
    studentListeners.forEach((fn) => fn())
    return students[index]
  },
  delete: (id: string): boolean => {
    const initialLen = students.length
    students = students.filter((s) => s.id !== id)
    const changed = students.length !== initialLen
    if (changed) studentListeners.forEach((fn) => fn())
    return changed
  },
  subscribe: (listener: Listener) => {
    studentListeners.add(listener)
    return () => {
      studentListeners.delete(listener)
    }
  },
}

export const notificationStore = {
  getAll: (): NotificationItem[] => [...notifications],
  markAsRead: (id: string) => {
    notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    notificationListeners.forEach((fn) => fn())
  },
  markAllAsRead: () => {
    notifications = notifications.map((n) => ({ ...n, read: true }))
    notificationListeners.forEach((fn) => fn())
  },
  subscribe: (listener: Listener) => {
    notificationListeners.add(listener)
    return () => {
      notificationListeners.delete(listener)
    }
  },
}
