export interface SheikhHalaqaDetail {
  id: number
  name: string
  level?: string
  branch_name: string
  student_count: number | string
}

export interface Sheikh {
  /** String form of the person id */
  id: string
  personId: number
  name: string
  phone: string
  email: string
  halaqat: string[]
  halaqaDetails?: SheikhHalaqaDetail[]
  branches: string[]
  studentCount: number
  status: "نشط" | "غير نشط"
}

export interface SheikhInput {
  name: string
  phone?: string
  email?: string
  birthDate?: string
  gender?: "ذكر" | "أنثى"
  halaqaIds?: number[]
}
