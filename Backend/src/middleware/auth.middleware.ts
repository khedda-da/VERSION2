import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { config } from "../config/env.js"
import { db } from "../db/database.js"
import type { AuthUser } from "../types/express.js"

export async function loadUserById(userId: number): Promise<AuthUser | null> {
  const userRow = await db.get(
    `SELECT u.id, u.username, u.is_active, p.id AS person_id, p.full_name, p.phone, p.email, p.person_type
     FROM users u
     JOIN persons p ON p.id = u.person_id
     WHERE u.id = ?`,
    [userId],
  )

  if (!userRow || !userRow.is_active) {
    return null
  }

  // Get roles
  const roles = await db.query(
    `SELECT r.id, r.name, r.scope, pr.branch_id
     FROM person_roles pr
     JOIN roles r ON r.id = pr.role_id
     WHERE pr.person_id = ?`,
    [userRow.person_id],
  )

  // Get branch assignment from branch_admins
  const branchAdminRow = await db.get(
    `SELECT branch_id FROM branch_admins WHERE person_id = ? LIMIT 1`,
    [userRow.person_id],
  )

  // Get taught halaqat
  const halaqatRows = await db.query(
    `SELECT halaqa_id FROM halaqat_persons WHERE person_id = ? AND role_in_halaqa = 'teacher'`,
    [userRow.person_id],
  )

  const isCentral = roles.some((r: any) => r.scope === "central")
  const isBranchAdmin =
    Boolean(branchAdminRow) || roles.some((r: any) => r.scope === "branch" || r.name === "مسؤول مقر")
  const branchId = branchAdminRow?.branch_id ?? roles.find((r: any) => r.branch_id)?.branch_id ?? null
  const teacherHalaqaIds = halaqatRows.map((h: any) => Number(h.halaqa_id))
  const isTeacher = teacherHalaqaIds.length > 0 || userRow.person_type === "sheikh"

  return {
    id: Number(userRow.id),
    personId: Number(userRow.person_id),
    username: userRow.username,
    fullName: userRow.full_name,
    email: userRow.email,
    phone: userRow.phone,
    personType: userRow.person_type,
    roles: roles.map((r: any) => ({
      id: Number(r.id),
      name: r.name,
      scope: r.scope,
      branchId: r.branch_id ? Number(r.branch_id) : null,
    })),
    isCentral,
    isBranchAdmin,
    isTeacher,
    branchId: branchId ? Number(branchId) : null,
    teacherHalaqaIds,
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "غير مصرح. يرجى تسجيل الدخول أولاً.",
    })
    return
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: number }
    const user = await loadUserById(decoded.userId)

    if (!user) {
      res.status(401).json({
        success: false,
        message: "حساب المستخدم غير صالح أو تم تعطيله.",
      })
      return
    }

    req.user = user
    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "جلسة العمل منتهية أو الرمز غير صالح.",
    })
  }
}

/**
 * Optional authentication: loads req.user if token is present, but doesn't block if missing
 */
export async function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: number }
      const user = await loadUserById(decoded.userId)
      if (user) {
        req.user = user
      }
    } catch {
      // Ignore invalid token in optional auth
    }
  }
  next()
}
