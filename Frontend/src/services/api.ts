import type {
  AuthUser,
  Branch,
  BranchInput,
  Halaqa,
  HalaqaInput,
  NotificationItem,
  Person,
  ReportKey,
  Role,
  Sheikh,
  SheikhInput,
  Student,
  StudentFilters,
  StudentInput,
  User,
} from "@/types"

/**
 * Base URL of the backend.
 *  - Default "/api": works with the Vite dev/preview proxy (see vite.config.ts)
 *    and with the Vercel rewrite `/api/(.*)` -> backend service (see vercel.json).
 *  - Set VITE_API_URL (e.g. "https://my-backend.example.com/api") to talk to a
 *    backend that is hosted on a different origin.
 */
const API_BASE: string = (
  (import.meta.env.VITE_API_URL as string | undefined) || "/api"
).replace(/\/+$/, "")

const TOKEN_KEY = "djam3ya_token"
export const UNAUTHORIZED_EVENT = "djam3ya:unauthorized"

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 0) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
  count?: number
}

export type ExportFormat = "xlsx" | "csv" | "pdf"

function readStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/** Drop empty strings / undefined so the backend falls back to its own handling. */
function clean(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === "") continue
    out[key] = value
  }
  return out
}

const genderToApi = (g?: string) =>
  g === "ذكر" ? "male" : g === "أنثى" ? "female" : g || undefined

type StudentQuery = Partial<StudentFilters> & { search?: string }

function studentQuery(filters: StudentQuery, extra: Record<string, string> = {}) {
  const q = new URLSearchParams(extra)
  if (filters.search) q.set("search", filters.search)
  if (filters.school) q.set("school", filters.school)
  if (filters.level) q.set("level", filters.level)
  if (filters.branch) q.set("branch", filters.branch)
  if (filters.halaqa) q.set("halaqa", filters.halaqa)
  if (filters.sheikh) q.set("sheikh", filters.sheikh)
  if (filters.minAge) q.set("min_age", filters.minAge)
  if (filters.maxAge) q.set("max_age", filters.maxAge)
  return q.toString()
}

class ApiClient {
  private token: string | null = readStoredToken()

  // ── Token handling ────────────────────────────────────────────────────────

  setToken(token: string | null) {
    this.token = token
    try {
      if (token) window.localStorage.setItem(TOKEN_KEY, token)
      else window.localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* storage unavailable – keep the in-memory token only */
    }
  }

  getToken(): string | null {
    return this.token
  }

  hasToken(): boolean {
    return Boolean(this.token)
  }

  // ── Low level ─────────────────────────────────────────────────────────────

  private authHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const headers = { ...extra }
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`
    return headers
  }

  private expireSession() {
    this.setToken(null)
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }

  private async request<T = unknown>(
    path: string,
    options: RequestInit & { skipAuthRedirect?: boolean } = {},
  ): Promise<Envelope<T>> {
    const { skipAuthRedirect, ...init } = options
    let response: Response
    try {
      response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: this.authHeaders({
          "Content-Type": "application/json",
          ...((init.headers as Record<string, string>) || {}),
        }),
      })
    } catch {
      throw new ApiError("تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت ثم حاول مجددا.")
    }

    const isJson = (response.headers.get("content-type") || "").includes("application/json")

    if (!isJson) {
      // Typical symptom of a mis-configured /api rewrite: the SPA's index.html
      // (or a platform error page) comes back instead of JSON.
      throw new ApiError(
        response.ok
          ? "استجابة غير صالحة من الخادم: لم يتم توجيه طلبات /api إلى الواجهة الخلفية."
          : `تعذر الوصول إلى الواجهة الخلفية (HTTP ${response.status}).`,
        response.status,
      )
    }

    const body = await response.json().catch(() => null)

    if (!response.ok || (body && body.success === false)) {
      if (response.status === 401 && !skipAuthRedirect && this.token) this.expireSession()
      throw new ApiError(body?.message || "حدث خطأ في الاتصال بالخادم", response.status)
    }

    return body as Envelope<T>
  }

  private get<T>(path: string) {
    return this.request<T>(path).then((r) => r.data)
  }

  private send<T = unknown>(method: "POST" | "PUT" | "DELETE", path: string, body?: unknown) {
    return this.request<T>(path, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  /** Fetch a file with the auth header and hand it to the browser as a download. */
  async download(path: string, fallbackName: string): Promise<void> {
    let response: Response
    try {
      response = await fetch(`${API_BASE}${path}`, { headers: this.authHeaders() })
    } catch {
      throw new ApiError("تعذر الاتصال بالخادم أثناء التصدير.")
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      if (response.status === 401 && this.token) this.expireSession()
      throw new ApiError(body?.message || "فشل تصدير الملف.", response.status)
    }

    const disposition = response.headers.get("content-disposition") || ""
    const match = /filename="?([^";]+)"?/i.exec(disposition)
    triggerBlobDownload(await response.blob(), match?.[1] || fallbackName)
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async login(username: string, password: string): Promise<AuthUser> {
    const res = await this.request<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: username.trim(), password }),
      skipAuthRedirect: true,
    })
    this.setToken(res.data.token)
    return res.data.user
  }

  /** Check a password without touching the stored session. */
  async verifyPassword(username: string, password: string): Promise<boolean> {
    try {
      await this.request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
        skipAuthRedirect: true,
      })
      return true
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return false
      throw error
    }
  }

  getMe() {
    return this.get<AuthUser>("/auth/me")
  }

  logout() {
    this.setToken(null)
  }

  // ── Students ──────────────────────────────────────────────────────────────

  private studentBody(data: Partial<StudentInput>) {
    return clean({
      name: data.name,
      phone: data.phone,
      email: data.email,
      birth_date: data.birthDate,
      gender: data.gender,
      school_name: data.school,
      academic_level: data.level,
      enrollment_date: data.enrollmentDate,
      branch_id: data.branchId,
      halaqa_id: data.halaqaId ?? undefined,
    })
  }

  getStudents(filters: StudentQuery = {}) {
    const qs = studentQuery(filters)
    return this.get<Student[]>(`/students${qs ? `?${qs}` : ""}`)
  }

  getStudent(id: string | number) {
    return this.get<Student>(`/students/${encodeURIComponent(String(id))}`)
  }

  async addStudent(data: StudentInput): Promise<Student> {
    const res = await this.send<Student>("POST", "/students", this.studentBody(data))
    return res.data
  }

  async updateStudent(id: string | number, data: Partial<StudentInput>): Promise<Student> {
    const body = this.studentBody(data)
    // `clean` drops empty strings; on update an explicitly emptied contact field must still be sent
    if (data.phone === "") body.phone = ""
    if (data.email === "") body.email = ""
    const res = await this.send<Student>("PUT", `/students/${encodeURIComponent(String(id))}`, body)
    return res.data
  }

  async deleteStudent(id: string | number): Promise<void> {
    await this.send("DELETE", `/students/${encodeURIComponent(String(id))}`)
  }

  exportStudents(format: ExportFormat, filters: StudentQuery = {}) {
    return this.download(
      `/students/export?${studentQuery(filters, { format })}`,
      `students.${format}`,
    )
  }

  // ── Branches ──────────────────────────────────────────────────────────────

  getBranches() {
    return this.get<Branch[]>("/branches")
  }

  getBranch(id: number | string) {
    return this.get<BranchDetail>(`/branches/${id}`)
  }

  private branchBody(data: BranchInput) {
    return {
      name: data.name,
      location: data.location,
      phone: data.phone,
      is_active: data.isActive,
      admin_ids: data.adminIds,
    }
  }

  async createBranch(data: BranchInput) {
    return (await this.send<BranchDetail>("POST", "/branches", this.branchBody(data))).data
  }

  async updateBranch(id: number | string, data: BranchInput) {
    return (await this.send<BranchDetail>("PUT", `/branches/${id}`, this.branchBody(data))).data
  }

  async deleteBranch(id: number | string) {
    await this.send("DELETE", `/branches/${id}`)
  }

  // ── Halaqat ───────────────────────────────────────────────────────────────

  getHalaqat() {
    return this.get<Halaqa[]>("/halaqat")
  }

  getHalaqa(id: number | string) {
    return this.get<HalaqaDetail>(`/halaqat/${id}`)
  }

  private halaqaBody(data: HalaqaInput) {
    return {
      name: data.name,
      level: data.level,
      branch_id: data.branchId,
      is_active: data.isActive,
      teacher_ids: data.teacherIds,
    }
  }

  async createHalaqa(data: HalaqaInput) {
    return (await this.send<HalaqaDetail>("POST", "/halaqat", this.halaqaBody(data))).data
  }

  async updateHalaqa(id: number | string, data: HalaqaInput) {
    return (await this.send<HalaqaDetail>("PUT", `/halaqat/${id}`, this.halaqaBody(data))).data
  }

  async deleteHalaqa(id: number | string) {
    await this.send("DELETE", `/halaqat/${id}`)
  }

  async enrollStudent(halaqaId: number | string, personId: number) {
    await this.send("POST", `/halaqat/${halaqaId}/students`, { person_id: personId })
  }

  async assignTeacher(halaqaId: number | string, personId: number) {
    await this.send("POST", `/halaqat/${halaqaId}/teachers`, { person_id: personId })
  }

  // ── Sheikhs / persons ─────────────────────────────────────────────────────

  getSheikhs() {
    return this.get<Sheikh[]>("/sheikhs")
  }

  getSheikh(personId: number | string) {
    return this.get<SheikhDetail>(`/sheikhs/${personId}`)
  }

  async createSheikh(data: SheikhInput) {
    const res = await this.send<SheikhDetail>(
      "POST",
      "/sheikhs",
      clean({
        full_name: data.name,
        phone: data.phone,
        email: data.email,
        birth_date: data.birthDate,
        gender: genderToApi(data.gender),
        halaqa_ids: data.halaqaIds,
      }),
    )
    return res.data
  }

  /** There is no dedicated sheikh-update route: a sheikh is a `person`. */
  async updatePerson(
    personId: number | string,
    data: { name?: string; phone?: string; email?: string; birthDate?: string; gender?: string },
  ) {
    await this.send("PUT", `/persons/${personId}`, {
      full_name: data.name,
      phone: data.phone,
      email: data.email,
      birth_date: data.birthDate,
      gender: genderToApi(data.gender),
    })
  }

  async deletePerson(personId: number | string) {
    await this.send("DELETE", `/persons/${personId}`)
  }

  getPersons(search?: string) {
    return this.get<Person[]>(`/persons${search ? `?search=${encodeURIComponent(search)}` : ""}`)
  }

  // ── Roles ─────────────────────────────────────────────────────────────────

  getRoles() {
    return this.get<Role[]>("/roles")
  }

  getRole(id: number | string) {
    return this.get<RoleDetail>(`/roles/${id}`)
  }

  async createRole(name: string, scope: "central" | "branch") {
    return (await this.send<RoleDetail>("POST", "/roles", { name, scope })).data
  }

  async assignRole(personId: number, roleId: number, branchId?: number | null) {
    await this.send("POST", "/roles/assign", {
      person_id: personId,
      role_id: roleId,
      branch_id: branchId ?? null,
    })
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  getUsers() {
    return this.get<User[]>("/users")
  }

  getUser(id: number | string) {
    return this.get<UserDetail>(`/users/${id}`)
  }

  async createUser(data: {
    personId: number
    username: string
    password: string
    roleId?: number
    branchId?: number | null
    isActive?: boolean
  }) {
    const res = await this.send<UserDetail>("POST", "/users", {
      person_id: data.personId,
      username: data.username,
      password: data.password,
      role_id: data.roleId,
      branch_id: data.branchId ?? undefined,
      is_active: data.isActive,
    })
    return res.data
  }

  async updateUser(
    id: number | string,
    data: {
      username?: string
      password?: string
      roleId?: number
      branchId?: number | null
      isActive?: boolean
    },
  ) {
    const res = await this.send<UserDetail>(
      "PUT",
      `/users/${id}`,
      clean({
        username: data.username,
        password: data.password,
        role_id: data.roleId,
        branch_id: data.branchId ?? undefined,
        is_active: data.isActive,
      }),
    )
    return res.data
  }

  async deleteUser(id: number | string) {
    await this.send("DELETE", `/users/${id}`)
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  getNotifications() {
    return this.get<NotificationItem[]>("/notifications")
  }

  async markNotificationAsRead(id: string | number) {
    await this.send("PUT", `/notifications/${encodeURIComponent(String(id))}/read`)
  }

  async markAllNotificationsAsRead() {
    await this.send("PUT", "/notifications/read-all")
  }

  // ── Dashboard / reports / audit ───────────────────────────────────────────

  getDashboardStats() {
    return this.get<DashboardStats>("/dashboard/stats")
  }

  getAudit(limit = 100) {
    return this.get<AuditEntry[]>(`/audit?limit=${limit}`)
  }

  getReport(key: ReportKey) {
    const path: Record<ReportKey, string> = {
      branch: "students-by-branch",
      level: "students-by-level",
      halaqa: "students-by-halaqa",
      sheikh: "students-by-sheikh",
      trends: "enrollment-trends",
    }
    return this.get<Record<string, unknown>[]>(`/reports/${path[key]}`)
  }

  exportReport(key: ReportKey, format: ExportFormat) {
    return this.download(`/reports/export?type=${key}&format=${format}`, `report_${key}.${format}`)
  }
}

// ── Detail payloads (shapes returned by the backend `getById` routes) ─────────

export interface BranchDetail extends Omit<Branch, "adminDetails"> {
  halaqat: {
    id: number
    name: string
    level: string | null
    is_active: number | boolean
    student_count: number | string
    teacher_name: string | null
  }[]
  adminDetails: { id: number; full_name?: string; name?: string; phone?: string; email?: string }[]
}

export interface HalaqaDetail {
  id: number
  name: string
  branch: string
  branchId: number
  level: string
  studentCount: number
  sheikh: string
  teachers: { id: number; full_name: string; phone?: string; email?: string }[]
  students: {
    person_id: number
    full_name: string
    phone?: string
    school_name?: string
    academic_level?: string
    enrollment_date?: string
  }[]
  status: string
  isActive: boolean
}

export interface SheikhDetail {
  id: string
  personId: number
  name: string
  phone: string
  email: string
  birthDate?: string | null
  gender?: "male" | "female" | null
  halaqat: string[]
  halaqaDetails: {
    id: number
    name: string
    level?: string
    branch_name: string
    student_count: number | string
  }[]
  branches: string[]
  studentCount: number
  students: {
    person_id: number
    full_name: string
    phone?: string
    school_name?: string
    academic_level?: string
    halaqa_name?: string
    branch_name?: string
  }[]
  status: string
}

export interface RoleDetail {
  id: string
  roleId: number
  name: string
  scope: "central" | "branch"
  userCount: number
  assignedPersons: {
    id: number
    full_name: string
    phone?: string
    email?: string
    branch_name?: string | null
  }[]
  status: string
}

export interface UserDetail {
  id: string
  userId: number
  personId: number
  username: string
  name: string
  email: string
  phone: string
  roles: { id: number; name: string; scope: string; branch_name: string | null }[]
  lastLogin: string | null
  status: string
  isActive: boolean
}

export interface DashboardStats {
  metrics: {
    totalStudents: number
    totalSheikhs: number
    totalHalaqat: number
    activeHalaqat: number
    totalBranches: number
    activeBranches: number
  }
  studentsByBranch: { name: string; val: string; count: number; width: number }[]
  studentsByLevel: Record<string, number>
  recentActivity: string[][]
}

export interface AuditEntry {
  id: number
  tableName: string
  tableLabel: string
  recordId: number | null
  action: "CREATE" | "UPDATE" | "DELETE" | string
  actionLabel: string
  user: string
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  timestamp: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Client-side CSV (UTF-8 BOM so Excel renders Arabic correctly). */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (value: string | number) => `"${String(value ?? "").replace(/"/g, '""')}"`
  const content = [headers, ...rows].map((row) => row.map(escape).join(",")).join("\r\n")
  triggerBlobDownload(new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" }), filename)
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "حدث خطأ غير متوقع"
}

export const api = new ApiClient()
