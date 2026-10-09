export interface User {
  id: string
  userId: number
  personId: number
  name: string
  username: string
  email: string
  phone: string
  role: string
  roles: string[]
  branch: string
  lastActive: string
  status: "نشط" | "غير نشط"
  isActive: boolean
}

export interface Person {
  id: number
  full_name: string
  phone: string | null
  email: string | null
  birth_date: string | null
  gender: "male" | "female" | null
  person_type: "student" | "sheikh" | "both"
}

/** The signed-in account, as returned by /auth/login and /auth/me */
export interface AuthUser {
  id: number
  personId: number
  username: string
  fullName: string
  email: string | null
  phone: string | null
  personType: string
  roles: { id: number; name: string; scope: "central" | "branch"; branchId: number | null }[]
  isCentral: boolean
  isBranchAdmin: boolean
  isTeacher: boolean
  branchId: number | null
  teacherHalaqaIds: number[]
}
