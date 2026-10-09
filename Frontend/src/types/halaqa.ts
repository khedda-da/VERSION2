export interface HalaqaTeacher {
  id: number
  name: string
  phone?: string
}

export interface Halaqa {
  id: number
  name: string
  branch: string
  branchId: number
  sheikh: string
  sheikhs: string[]
  teacherDetails: HalaqaTeacher[]
  level: string
  studentCount: number
  status: "نشط" | "متوقف"
  isActive: boolean
}

export interface HalaqaRecord {
  id: number | string
  name: string
  branch: string
  sheikh: string
  level: string
  students: number
}

export interface HalaqaInput {
  name: string
  level?: string
  branchId: number
  isActive?: boolean
  teacherIds?: number[]
}
