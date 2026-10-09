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

  async getCurrentUser(userId: number): Promise<AuthUser> {
    const user = await loadUserById(userId)
    if (!user) {
      throw new AppError("المستخدم غير موجود", 404)
    }
    return user
  }
}

export const authService = new AuthService()
