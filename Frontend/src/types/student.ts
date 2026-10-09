export type StudentLevel = "ابتدائي" | "متوسط" | "ثانوي" | "جامعي"
export type StudentStatus = "نشط" | "متوقف"

export interface Student {
  /** Display id returned by the API, e.g. "DJ-1042" */
  id: string
  /** Numeric database ids (present on every record coming from the API) */
  studentId?: number
  personId?: number
  branchId?: number
  halaqaId?: number | null
  sheikhId?: number | null
  name: string
  initials: string
  age: number
  school: string
  level: StudentLevel
  branch: string
  halaqa: string
  sheikh: string
  date: string
  enrollmentDateRaw?: string
  status: StudentStatus
  phone?: string
  email?: string
  birthDate?: string
  gender?: "ذكر" | "أنثى" | ""
}

/** Shape the student form produces; mapped to snake_case by the API client. */
export interface StudentInput {
  name: string
  phone?: string
  email?: string
  birthDate?: string
  gender?: "ذكر" | "أنثى"
  school?: string
  level?: string
  enrollmentDate?: string
  branchId?: number
  halaqaId?: number | null
}
