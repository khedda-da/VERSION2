import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { db } from "../../db/database.js"
import { config } from "../../config/env.js"
import { AppError } from "../../middleware/error.middleware.js"
import { loadUserById } from "../../middleware/auth.middleware.js"
import { logAudit } from "../../middleware/audit.middleware.js"
import type { AuthUser } from "../../types/express.js"

const USERNAME_RE = /^[A-Za-z0-9._-]{3,50}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

    const isMatch = await bcrypt.compare(password, userRow.password_hash)
    if (!isMatch) {
      throw new AppError("اسم المستخدم أو كلمة المرور غير صحيحة", 401)
    }

    // Checked only after the password is verified, so usernames cannot be probed.
    if (!userRow.is_active) {
      throw new AppError(
        "حسابك غير مفعّل بعد: إما أنه بانتظار موافقة إدارة الجمعية أو أنه معطّل. يرجى مراجعة الإدارة.",
        403,
      )
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

  async getStatus(): Promise<{ needsSetup: boolean; registrationOpen: boolean }> {
    const needsSetup = await this.needsSetup()
    return { needsSetup, registrationOpen: !needsSetup && config.allowRegistration }
  }

  /**
   * Public self-registration. The account is created INACTIVE (no token is issued)
   * and has no role, so nothing is accessible until a central admin approves it
   * from the Users page. It never links to an existing person record.
   */
  async register(input: {
    fullName?: string
    username?: string
    password?: string
    email?: string
    phone?: string
  }): Promise<{ pending: true }> {
    if (await this.needsSetup()) {
      throw new AppError("النظام غير مُعدّ بعد. أنشئ حساب المدير الأول من صفحة الإعداد.", 403)
    }
    if (!config.allowRegistration) {
      throw new AppError("التسجيل الذاتي غير متاح حاليًا. تواصل مع إدارة الجمعية.", 403)
    }

    const fullName = String(input.fullName ?? "").trim()
    const username = String(input.username ?? "").trim()
    const password = String(input.password ?? "")
    const email = String(input.email ?? "").trim() || null
    const phone = String(input.phone ?? "").trim() || null

    if (!fullName || fullName.length > 200) throw new AppError("يرجى إدخال الاسم الكامل", 400)
    if (!USERNAME_RE.test(username)) {
      throw new AppError(
        "اسم المستخدم يجب أن يتكون من 3 إلى 50 حرفًا (أحرف لاتينية وأرقام و . _ - فقط)",
        400,
      )
    }
    if (password.length < 8 || password.length > 128) {
      throw new AppError("كلمة المرور يجب أن تتكون من 8 أحرف على الأقل", 400)
    }
    if (!email && !phone) throw new AppError("يرجى إدخال البريد الإلكتروني أو رقم الهاتف", 400)
    if (email && (email.length > 255 || !EMAIL_RE.test(email))) {
      throw new AppError("البريد الإلكتروني غير صالح", 400)
    }
    if (phone && phone.length > 20) throw new AppError("رقم الهاتف غير صالح", 400)

    if (await db.get(`SELECT id FROM users WHERE LOWER(username) = LOWER(?)`, [username])) {
      throw new AppError("اسم المستخدم مستخدم بالفعل", 409)
    }
    if (
      email &&
      (await db.get(
        `SELECT u.id FROM users u JOIN persons p ON p.id = u.person_id WHERE LOWER(p.email) = LOWER(?)`,
        [email],
      ))
    ) {
      throw new AppError("هذا البريد الإلكتروني مسجّل بحساب آخر", 409)
    }
    if (
      phone &&
      (await db.get(
        `SELECT u.id FROM users u JOIN persons p ON p.id = u.person_id WHERE p.phone = ?`,
        [phone],
      ))
    ) {
      throw new AppError("رقم الهاتف هذا مسجّل بحساب آخر", 409)
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // person_type is NOT NULL and limited to student/sheikh/both. "student" keeps the
    // registrant out of the sheikhs list; an admin can change it later.
    const person = await db.run(
      `INSERT INTO persons (full_name, phone, email, person_type) VALUES (?, ?, ?, 'student')`,
      [fullName, phone, email],
    )

    let userId: number
    try {
      const created = await db.run(
        `INSERT INTO users (person_id, username, password_hash, is_active) VALUES (?, ?, ?, FALSE)`,
        [person.lastInsertRowid, username, passwordHash],
      )
      userId = created.lastInsertRowid
    } catch (err) {
      await db.run(`DELETE FROM persons WHERE id = ?`, [person.lastInsertRowid])
      throw err
    }

    await logAudit("users", userId, "CREATE", userId, null, { username, selfRegistered: true })

    // Tell active central admins there is a request waiting. Never fail the signup over this.
    try {
      const admins = await db.query(
        `SELECT DISTINCT u.id FROM users u
         JOIN person_roles pr ON pr.person_id = u.person_id
         JOIN roles r ON r.id = pr.role_id
         WHERE u.is_active = TRUE AND r.scope = 'central'`,
      )
      for (const admin of admins) {
        await db.run(
          `INSERT INTO notifications (user_id, title, body, type, is_read, related_entity_type, related_entity_id)
           VALUES (?, ?, ?, 'info', FALSE, 'user', ?)`,
          [
            admin.id,
            "طلب تسجيل جديد",
            `طلب ${fullName} (${username}) إنشاء حساب وينتظر موافقتك من صفحة المستخدمين.`,
            userId,
          ],
        )
      }
    } catch (err) {
      console.error("[Auth] Could not notify admins about the new registration:", err)
    }

    return { pending: true }
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
    if (!USERNAME_RE.test(username)) {
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
      await db.run(`INSERT INTO roles (name, scope, is_active) VALUES (?, 'central', TRUE)`, [
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
