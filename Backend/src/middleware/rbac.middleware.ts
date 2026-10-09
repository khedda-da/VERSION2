import type { Request, Response, NextFunction } from "express"
import type { AuthUser } from "../types/express.js"

export type UserScopeType = "central" | "branch" | "teacher" | "none"

export interface UserScope {
  type: UserScopeType
  branchId?: number | null
  halaqaIds?: number[]
  personId?: number
}

export function getUserScope(user?: AuthUser): UserScope {
  if (!user) return { type: "none" }

  if (user.isCentral) {
    return { type: "central" }
  }

  if (user.isBranchAdmin && user.branchId) {
    return {
      type: "branch",
      branchId: user.branchId,
    }
  }

  if (user.isTeacher && user.teacherHalaqaIds && user.teacherHalaqaIds.length > 0) {
    return {
      type: "teacher",
      halaqaIds: user.teacherHalaqaIds,
      personId: user.personId,
    }
  }

  return { type: "none" }
}

export function canAccessBranch(user: AuthUser | undefined, branchId: number): boolean {
  if (!user) return false
  if (user.isCentral) return true
  if (user.isBranchAdmin && user.branchId === branchId) return true
  return false
}

export function canAccessHalaqa(
  user: AuthUser | undefined,
  halaqaBranchId: number,
  halaqaId: number,
): boolean {
  if (!user) return false
  if (user.isCentral) return true
  if (user.isBranchAdmin && user.branchId === halaqaBranchId) return true
  if (user.isTeacher && user.teacherHalaqaIds?.includes(halaqaId)) return true
  return false
}

export function requireCentral(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "غير مصرح" })
    return
  }
  if (!req.user.isCentral) {
    res.status(403).json({
      success: false,
      message: "هذه العملية تتطلب صلاحيات مسؤول إداري مركزي.",
    })
    return
  }
  next()
}

export function requireBranchOrCentral(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "غير مصرح" })
    return
  }
  if (!req.user.isCentral && !req.user.isBranchAdmin) {
    res.status(403).json({
      success: false,
      message: "هذه العملية تتطلب صلاحيات مسؤول مركزي أو مسؤول مقر.",
    })
    return
  }
  next()
}

export const ADMIN_ROLE_NAME = "مسؤول الإدارة"

/** Only users holding the administrator role ("مسؤول الإدارة"). */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "غير مصرح" })
    return
  }
  if (!req.user.roles.some((r) => r.name === ADMIN_ROLE_NAME)) {
    res.status(403).json({
      success: false,
      message: "إضافة الحسابات متاحة لمدير النظام فقط.",
    })
    return
  }
  next()
}
