import { useEffect, useState } from "react"

// Layout
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { MobileNav } from "@/components/layout/MobileNav"

// UI
import { Icon } from "@/components/ui/Icon"

// Features
import { LoginView, SetupView } from "@/features/auth"
import { DashboardView } from "@/features/dashboard"
import { StudentsView } from "@/features/students/StudentsView"
import { StudentProfile } from "@/features/students/StudentProfile"
import { StudentFilterDrawer } from "@/features/students/StudentFilterDrawer"
import {
  EntityListView,
  EntityProfileView,
  EntityForm,
  AssignmentDialog,
  ConfirmDialog,
  SuccessDialog,
  ExportDialog,
} from "@/features/entities"
import type { FormInitial, FormResult } from "@/features/entities/EntityForm"
import type { AssignTarget } from "@/features/entities/AssignmentDialog"
import type { EntityDetail } from "@/features/entities/entityModel"
import type { ExportRequest } from "@/features/entities/exportTypes"
import { ActivityView } from "@/features/activity"
import { NotificationPopover } from "@/features/notifications/NotificationPopover"
import { NotificationCenterView } from "@/features/notifications/NotificationCenterView"
import { SettingsView } from "@/features/settings"
import { SearchOverlay } from "@/features/search"
import type { SearchPick } from "@/features/search/SearchOverlay"
import { ReportsView } from "@/features/reports"

// Services
import { api, downloadCsv, errorMessage } from "@/services/api"
import { useAuth } from "@/services/AuthContext"
import { useData } from "@/services/DataContext"
import type { DataKey } from "@/services/DataContext"
import { emptyStudentFilters, entityMeta } from "@/services/constants"

// Types
import type { Screen, EntityType, FormKind } from "@/types/navigation"
import type { Student } from "@/types/student"
import type { StudentFilters } from "@/types/filters"

// ── Constants ────────────────────────────────────────────────────────────────

const SCREEN_TITLES: Record<Screen, string> = {
  dashboard: "نظرة عامة",
  students: "الطلاب",
  sheikhs: "الشيوخ",
  halaqat: "الحلقات",
  branches: "المقرات",
  roles: "الأدوار",
  users: "المستخدمون",
  reports: "التقارير",
  activity: "سجل النشاط",
  notifications: "الإشعارات",
  settings: "الإعدادات",
  student: "ملف الطالب",
  entity: "الملف",
  login: "تسجيل الدخول",
}

const ENTITY_SCREENS: EntityType[] = ["sheikhs", "halaqat", "branches", "roles", "users"]

const ENTITY_TO_FORM_KIND: Record<EntityType, FormKind> = {
  sheikhs: "sheikh",
  halaqat: "halaqa",
  branches: "branch",
  roles: "role",
  users: "user",
}

const FORM_KIND_TO_ENTITY: Partial<Record<FormKind, EntityType>> = {
  sheikh: "sheikhs",
  halaqa: "halaqat",
  branch: "branches",
  role: "roles",
  user: "users",
}

interface FormState {
  kind: FormKind
  mode: "add" | "edit"
  initial?: FormInitial
  presetBranchId?: number
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const { user, status, logout } = useAuth()
  const data = useData()
  const { students } = data

  // Navigation
  const [screen, setScreen] = useState<Screen>("dashboard")
  const [entityProfile, setEntityProfile] = useState<{
    type: EntityType
    id: string
    name: string
  } | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  /** bumped after every mutation so open profile pages re-fetch */
  const [version, setVersion] = useState(0)

  // UI state
  const [darkMode, setDarkMode] = useState(
    () => window.localStorage.getItem("djam3ya-theme") === "dark",
  )
  const [mobileMenu, setMobileMenu] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [onlineState, setOnlineState] = useState<"online" | "offline" | "syncing">("online")
  const [toast, setToast] = useState("")

  // Filters
  const [studentFilters, setStudentFilters] = useState<StudentFilters>(emptyStudentFilters)

  // Modals / dialogs
  const [form, setForm] = useState<FormState | null>(null)
  const [exporting, setExporting] = useState<ExportRequest | null>(null)
  const [assignment, setAssignment] = useState<AssignTarget | null>(null)
  const [success, setSuccess] = useState<{ kind: FormKind; message: string; result: FormResult } | null>(null)
  const [confirm, setConfirm] = useState<{
    title: string
    detail: string
    onConfirm: () => void
  } | null>(null)

  // ── Helpers ────────────────────────────────────────────────────────────────

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(""), 3200)
  }

  const navigate = (next: Screen) => {
    setScreen(next)
    if (next !== "entity") setEntityProfile(null)
  }

  const openEntityProfile = (type: EntityType, id: string, name: string) => {
    setEntityProfile({ type, id, name })
    setScreen("entity")
  }

  const openStudent = (student: Student) => {
    setSelectedStudent(student)
    setScreen("student")
    setEntityProfile(null)
  }

  const afterMutation = async (keys: DataKey[]) => {
    await data.refresh(keys)
    setVersion((v) => v + 1)
  }

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setSearchOpen(true)
      }
      if (event.key === "Escape") {
        setSearchOpen(false)
        setNotificationsOpen(false)
      }
    }
    const offline = () => setOnlineState("offline")
    const online = () => {
      setOnlineState("syncing")
      void data.refresh().finally(() => setOnlineState("online"))
    }
    window.addEventListener("keydown", keyboard)
    window.addEventListener("offline", offline)
    window.addEventListener("online", online)
    return () => {
      window.removeEventListener("keydown", keyboard)
      window.removeEventListener("offline", offline)
      window.removeEventListener("online", online)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light"
    window.localStorage.setItem("djam3ya-theme", darkMode ? "dark" : "light")
  }, [darkMode])

  // Fresh UI whenever a different account signs in (or out).
  const userId = user?.id
  useEffect(() => {
    setScreen("dashboard")
    setEntityProfile(null)
    setSelectedStudent(null)
    setForm(null)
    setExporting(null)
    setAssignment(null)
    setSuccess(null)
    setConfirm(null)
    setStudentFilters(emptyStudentFilters)
    setNotificationsOpen(false)
    setSearchOpen(false)
  }, [userId])

  // Keep the open student profile in sync with refreshed data (or drop it if deleted).
  useEffect(() => {
    setSelectedStudent((current) => {
      if (!current?.studentId) return current
      return students.find((s) => s.studentId === current.studentId) ?? current
    })
  }, [students])

  // ── Auth gate ──────────────────────────────────────────────────────────────

  if (status === "loading")
    return (
      <div className="login-page" dir="rtl" role="status" aria-label="جارٍ التحميل">
        <main className="login-form">
          <div className="page-title">جارٍ التحميل...</div>
        </main>
      </div>
    )

  if (status === "setup") return <SetupView />

  if (status === "anon" || !user) return <LoginView />

  // ── Actions ────────────────────────────────────────────────────────────────

  const runDelete = async (action: () => Promise<void>, keys: DataKey[], after: () => void) => {
    try {
      await action()
      await afterMutation(keys)
      after()
      showToast("تم الحذف بنجاح.")
    } catch (err) {
      showToast(errorMessage(err))
    }
  }

  const askDeleteStudent = (student: Student) =>
    setConfirm({
      title: "حذف الطالب؟",
      detail: "سيؤثر حذف الطالب في عضوياته ضمن الحلقات. لا يمكن التراجع عن هذا الإجراء.",
      onConfirm: () =>
        void runDelete(
          () => api.deleteStudent(student.studentId ?? student.id),
          ["students", "halaqat", "branches", "sheikhs"],
          () => {
            setSelectedStudent(null)
            navigate("students")
          },
        ),
    })

  const askDeleteEntity = (detail: EntityDetail) => {
    const name = detail.data.name
    const goBackToList = () => navigate(detail.type as Screen)
    const confirmWith = (action: () => Promise<void>, keys: DataKey[]) =>
      setConfirm({
        title: `حذف ${name}؟`,
        detail: "قد يؤثر الحذف في العلاقات والتعيينات المرتبطة. لا يمكن التراجع عن هذا الإجراء.",
        onConfirm: () => void runDelete(action, keys, goBackToList),
      })

    switch (detail.type) {
      case "sheikhs":
        return confirmWith(() => api.deletePerson(detail.data.personId), ["sheikhs", "halaqat", "students"])
      case "halaqat":
        return confirmWith(() => api.deleteHalaqa(detail.data.id), ["halaqat", "sheikhs", "branches", "students"])
      case "branches":
        return confirmWith(() => api.deleteBranch(detail.data.id), ["branches", "halaqat"])
      case "users":
        return confirmWith(() => api.deleteUser(detail.data.userId), ["users"])
      default:
        return showToast("حذف الأدوار غير متاح.")
    }
  }

  const assignFor = (detail: EntityDetail) => {
    switch (detail.type) {
      case "sheikhs":
        return setAssignment({ mode: "sheikh-to-halaqat", personId: detail.data.personId, name: detail.data.name })
      case "halaqat":
        return setAssignment({ mode: "students-to-halaqa", halaqaId: detail.data.id, name: detail.data.name })
      case "branches":
        return setForm({ kind: "halaqa", mode: "add", presetBranchId: detail.data.id })
      case "roles":
        return setAssignment({
          mode: "role-to-people",
          roleId: detail.data.roleId,
          name: detail.data.name,
          branchScoped: detail.data.scope === "branch",
        })
      case "users":
        return setAssignment({ mode: "reset-password", userId: detail.data.userId, name: detail.data.name })
    }
  }

  const studentExport = (count: number, query: string) =>
    setExporting({
      title: "الطلاب",
      count,
      formats: ["xlsx", "csv", "pdf"],
      allowScope: true,
      run: (format, scope) =>
        api.exportStudents(format, scope === "current" ? { ...studentFilters, search: query } : {}),
    })

  const singleStudentExport = (student: Student) =>
    setExporting({
      title: "ملف الطالب",
      count: 1,
      formats: ["csv"],
      run: async () =>
        downloadCsv(
          `student-${student.id}.csv`,
          ["المعرف", "الاسم", "العمر", "المستوى", "المؤسسة", "المقر", "الحلقة", "الشيخ", "تاريخ التسجيل", "الهاتف"],
          [[student.id, student.name, student.age, student.level, student.school, student.branch, student.halaqa, student.sheikh, student.date, student.phone || ""]],
        ),
    })

  const summaryExport = () =>
    setExporting({
      title: "ملخص الجمعية",
      count: data.branches.length,
      formats: ["xlsx", "csv", "pdf"],
      run: (format) => api.exportReport("branch", format),
    })

  const pick = (result: SearchPick) => {
    if (result.kind === "student") openStudent(result.student)
    else openEntityProfile(result.type, result.id, result.name)
  }

  const handleSuccessPrimary = () => {
    if (!success) return
    const { kind, result } = success
    setSuccess(null)
    if (kind === "student" && result.student) return openStudent(result.student)
    const type = FORM_KIND_TO_ENTITY[kind]
    if (type) openEntityProfile(type, result.id, result.name)
  }

  const handleSuccessSecondary = () => {
    if (!success) return
    const { kind, result } = success
    setSuccess(null)
    switch (kind) {
      case "sheikh":
        return setAssignment({ mode: "sheikh-to-halaqat", personId: Number(result.id), name: result.name })
      case "halaqa":
        return setAssignment({ mode: "students-to-halaqa", halaqaId: Number(result.id), name: result.name })
      case "branch":
        return setForm({ kind: "halaqa", mode: "add", presetBranchId: Number(result.id) })
      default:
        return setForm({ kind, mode: "add" })
    }
  }

  // ── Main content ───────────────────────────────────────────────────────────

  const screenTitle =
    screen === "entity" ? entityProfile?.name ?? "الملف" : SCREEN_TITLES[screen]

  const content = (() => {
    if (screen === "dashboard")
      return (
        <DashboardView
          navigate={navigate}
          onAdd={(kind) => setForm({ kind, mode: "add" })}
          onExport={summaryExport}
          onOpenEntity={openEntityProfile}
        />
      )

    if (screen === "students")
      return (
        <StudentsView
          students={students}
          filters={studentFilters}
          setFilters={setStudentFilters}
          onProfile={openStudent}
          onAdd={() => setForm({ kind: "student", mode: "add" })}
          onFilters={() => setFiltersOpen(true)}
          onExport={studentExport}
          onBulkAssign={(selected) => {
            const personIds = selected.map((s) => s.personId).filter((id): id is number => Boolean(id))
            if (personIds.length) setAssignment({ mode: "students-bulk", personIds })
          }}
          onDelete={askDeleteStudent}
        />
      )

    if (screen === "student")
      return (
        <StudentProfile
          student={selectedStudent ?? undefined}
          goBack={() => navigate("students")}
          navigate={navigate}
          onOpenEntity={openEntityProfile}
          onEdit={() =>
            selectedStudent && setForm({ kind: "student", mode: "edit", initial: selectedStudent })
          }
          onExport={() => selectedStudent && singleStudentExport(selectedStudent)}
          onAssign={() =>
            selectedStudent?.personId &&
            setAssignment({
              mode: "student-to-halaqat",
              personId: selectedStudent.personId,
              name: selectedStudent.name,
            })
          }
          onDelete={() => selectedStudent && askDeleteStudent(selectedStudent)}
        />
      )

    if (screen === "entity" && entityProfile)
      return (
        <EntityProfileView
          key={`${entityProfile.type}-${entityProfile.id}`}
          type={entityProfile.type}
          id={entityProfile.id}
          name={entityProfile.name}
          version={version}
          onBack={() => navigate(entityProfile.type as Screen)}
          onEdit={(detail) =>
            setForm({ kind: ENTITY_TO_FORM_KIND[detail.type], mode: "edit", initial: detail })
          }
          onExport={setExporting}
          onAssign={assignFor}
          onDelete={askDeleteEntity}
          onOpenRelated={openEntityProfile}
          onOpenStudent={openStudent}
        />
      )

    if ((ENTITY_SCREENS as string[]).includes(screen))
      return (
        <EntityListView
          type={screen as EntityType}
          onAdd={() => setForm({ kind: ENTITY_TO_FORM_KIND[screen as EntityType], mode: "add" })}
          onExport={setExporting}
          onOpen={openEntityProfile}
        />
      )

    if (screen === "reports") return <ReportsView onMessage={showToast} />

    if (screen === "activity") return <ActivityView />

    if (screen === "notifications") return <NotificationCenterView navigate={navigate} />

    return <SettingsView onSave={showToast} />
  })()

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="app" dir="rtl">
      <Sidebar
        screen={screen}
        setScreen={navigate}
        open={mobileMenu}
        onClose={() => setMobileMenu(false)}
        onLogout={logout}
      />

      <div className="app-main">
        <Header
          title={screenTitle}
          onMenu={() => setMobileMenu(true)}
          onSearch={() => setSearchOpen(true)}
          onNotifications={() => setNotificationsOpen(true)}
          onLanguage={() =>
            showToast("يمكن تغيير العربية أو الفرنسية أو الإنجليزية من الإعدادات.")
          }
          darkMode={darkMode}
          onThemeToggle={() => setDarkMode((prev) => !prev)}
          unreadCount={data.unreadCount}
        />

        {onlineState !== "online" && (
          <div className="network-status">
            <Icon name={onlineState === "offline" ? "warning" : "upload"} size={16} />
            {onlineState === "offline"
              ? "غير متصل — يتم عرض آخر بيانات محمّلة."
              : "عاد الاتصال — جارٍ تحديث البيانات..."}
          </div>
        )}

        {content}
      </div>

      <MobileNav screen={screen} navigate={navigate} />

      {/* ── Overlays ──────────────────────────────────────────────────────── */}

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} onPick={pick} />}

      {filtersOpen && (
        <StudentFilterDrawer
          value={studentFilters}
          onClose={() => setFiltersOpen(false)}
          onApply={(value) => {
            setStudentFilters(value)
            setFiltersOpen(false)
            showToast("تم تطبيق الفلاتر.")
          }}
        />
      )}

      {notificationsOpen && (
        <NotificationPopover
          onClose={() => setNotificationsOpen(false)}
          onOpenCenter={() => navigate("notifications")}
          navigate={navigate}
        />
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}

      {form && (
        <EntityForm
          kind={form.kind}
          mode={form.mode}
          initial={form.initial}
          presetBranchId={form.presetBranchId}
          onClose={() => setForm(null)}
          onSuccess={(message, result) => {
            const completed = form
            setForm(null)
            setVersion((v) => v + 1)
            if (result.student) setSelectedStudent(result.student)
            if (completed.mode === "add") setSuccess({ kind: completed.kind, message, result })
            else showToast(message)
          }}
        />
      )}

      {success && (
        <SuccessDialog
          kind={success.kind}
          message={success.message}
          onClose={() => setSuccess(null)}
          onPrimary={handleSuccessPrimary}
          onSecondary={handleSuccessSecondary}
        />
      )}

      {exporting && (
        <ExportDialog request={exporting} onClose={() => setExporting(null)} onReady={showToast} />
      )}

      {assignment && (
        <AssignmentDialog
          target={assignment}
          onClose={() => setAssignment(null)}
          onDone={(message) => {
            setVersion((v) => v + 1)
            showToast(message)
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          detail={confirm.detail}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null)
            confirm.onConfirm()
          }}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <Icon name="check" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  )
}
