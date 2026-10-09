import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { db } from "../../db/database.js"
import { config } from "../../config/env.js"
import { AppError } from "../../middleware/error.middleware.js"
import { loadUserById } from "../../middleware/auth.middleware.js"
import type { AuthUser } from "../../types/express.js"

export class AuthService {
  async login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
    if (!username || !password) {
      throw new AppError("يرجى إدخال اسم المستخدم وكلمة المرور", 400)
    }

    const userRow = await db.get(
      `SELECT id, username, password_hash, is_active FROM users WHERE username = ?`,
      [username.trim()],
    )

    if (!userRow) {
      throw new AppError("اسم المستخدم أو كلمة المرور غير صحيحة", 401)
    }

    if (!userRow.is_active) {
      throw new AppError("هذا الحساب معطّل. يرجى مراجعة إدارة الجمعية.", 403)
    }

    const isMatch = await bcrypt.compare(password, userRow.password_hash)
    if (!isMatch) {
      throw new AppError("اسم المستخدم أو كلمة المرور غير صحيحة", 401)
    }

    // Update last_login
    await db.run(
      `UPDATE users SET last_login = ${db.isPostgres() ? "NOW()" : "datetime('now')"} WHERE id = ?`,
      [userRow.id],
    )

    const user = await loadUserById(userRow.id)
    if (!user) {
      throw new AppError("فشل تحميل بيانات المستخدم", 500)
    }

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, {
      expiresIn: "7d",
    })

    return { token, user }
  }

  async needsSetup(): Promise<boolean> {
    const row = await db.get(`SELECT COUNT(*) AS count FROM users`)
    return Number((row as any)?.count ?? 0) === 0
  }

  /**
   * Creates the very first administrator. Only allowed while the users table is empty.
   */
  async setupFirstUser(input: {
    fullName?: string
    username?: string
    password?: string
    email?: string
    phone?: string
  }): Promise<{ token: string; user: AuthUser }> {
    if (!(await this.needsSetup())) {
      throw new AppError("تم إعداد النظام مسبقًا.", 403)
    }

    const fullName = (input.fullName ?? "").trim()
    const username = (input.username ?? "").trim()
    const password = input.password ?? ""
    const email = (input.email ?? "").trim() || null
    const phone = (input.phone ?? "").trim() || null

    if (!fullName) throw new AppError("يرجى إدخال الاسم الكامل", 400)
    if (!/^[A-Za-z0-9._-]{3,50}$/.test(username)) {
      throw new AppError(
        "اسم المستخدم يجب أن يتكون من 3 إلى 50 حرفًا (أحرف لاتينية وأرقام و . _ - فقط)",
        400,
      )
    }
    if (password.length < 8) {
      throw new AppError("كلمة المرور يجب أن لا تقل عن 8 أحرف", 400)
    }
    if (!email && !phone) {
      throw new AppError("يرجى إدخال البريد الإلكتروني أو رقم الهاتف", 400)
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError("البريد الإلكتروني غير صالح", 400)
    }

    // The admin role must exist (seedDatabase creates it, this is a safety net).
    const adminRoleName = "مسؤول الإدارة"
    let role = await db.get(`SELECT id FROM roles WHERE name = ?`, [adminRoleName])
    if (!role) {
      await db.run(`INSERT INTO roles (name, scope, is_active) VALUES (?, 'central', 1)`, [
        adminRoleName,
      ])
      role = await db.get(`SELECT id FROM roles WHERE name = ?`, [adminRoleName])
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const person = await db.run(
      `INSERT INTO persons (full_name, phone, email, person_type) VALUES (?, ?, ?, 'both')`,
      [fullName, phone, email],
    )

    // Atomic guard: the row is only inserted if no user exists yet (prevents two
    // simultaneous setup requests from both succeeding).
    const inserted = await db.run(
      `INSERT INTO users (person_id, username, password_hash)
       SELECT CAST(? AS BIGINT), CAST(? AS VARCHAR(100)), CAST(? AS VARCHAR(255))
       WHERE NOT EXISTS (SELECT 1 FROM users)`,
      [person.lastInsertRowid, username, passwordHash],
    )

    if (inserted.changes === 0) {
      await db.run(`DELETE FROM persons WHERE id = ?`, [person.lastInsertRowid])
      throw new AppError("تم إعداد النظام مسبقًا.", 403)
    }

    await db.run(
      `INSERT INTO person_roles (person_id, role_id, branch_id) VALUES (?, ?, NULL)`,
      [person.lastInsertRowid, (role as any).id],
    )

    return this.login(username, password)
  }

  async getCurrentUser(userId: number): Promise<AuthUser> {
    const user = await loadUserById(userId)
    if (!user) {
      throw new AppError("المستخدم غير موجود", 404)
    }
    return user
  }
}

export const authService = new AuthService()
