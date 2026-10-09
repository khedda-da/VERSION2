export interface BranchAdmin {
  id: number
  name: string
  phone?: string
  email?: string
}

export interface Branch {
  id: number
  name: string
  location: string
  phone?: string
  studentCount: number
  adminCount: number
  admins: string[]
  adminDetails?: BranchAdmin[]
  halaqaCount: number
  status: "نشط" | "غير نشط"
  isActive: boolean
}

export interface BranchInput {
  name: string
  location?: string
  phone?: string
  isActive?: boolean
  adminIds?: number[]
}
