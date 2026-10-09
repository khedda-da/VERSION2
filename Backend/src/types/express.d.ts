export interface AuthUser {
  id: number
  personId: number
  username: string
  fullName: string
  email?: string
  phone?: string
  personType: "student" | "sheikh" | "both"
  roles: Array<{
    id: number
    name: string
    scope: "central" | "branch"
    branchId?: number | null
  }>
  isCentral: boolean
  isBranchAdmin: boolean
  isTeacher: boolean
  branchId?: number | null
  teacherHalaqaIds?: number[]
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}
