import type { Request } from "express"
import bcrypt from "bcryptjs"
import { db } from "../../db/database.js"
import { AppError } from "../../middleware/error.middleware.js"
import { logAudit } from "../../middleware/audit.middleware.js"
import { assertAccountCode } from "../../utils/access-code.js"
import type { AuthUser } from "../../types/express.js"

export interface CreateUserDto {
  person_id: number
  username: string
  password?: string
  role_id?: number
  branch_id?: number | null
  is_active?: boolean
  account_code?: string
}

export interface UpdateUserDto {
  username?: string
  password?: string
  is_active?: boolean
  role_id?: number
  branch_id?: number | null
}

export class UsersService {
  async getAll() {
    const users = await db.query(
      `SELECT u.id, u.username, u.last_login, u.is_active, u.created_at,
              p.id as person_id, p.full_name, p.email, p.phone
       FROM users u
       JOIN persons p ON p.id = u.person_id
       ORDER BY u.id ASC`,
    )

    // Roles and branches for each user
    const userRoles = await db.query(
      `SELECT pr.person_id, r.name as role_name, r.scope, b.name as branch_name
       FROM person_roles pr
       JOIN roles r ON r.id = pr.role_id
       LEFT JOIN branches b ON b.id = pr.branch_id`,
    )

    const rolesByPerson: Record<number, any[]> = {}
    userRoles.forEach((ur: any) => {
      const pId = Number(ur.person_id)
      if (!rolesByPerson[pId]) rolesByPerson[pId] = []
      rolesByPerson[pId].push(ur)
    })

    return users.map((u: any) => {
      const pId = Number(u.person_id)
      const roles = rolesByPerson[pId] || []
      const primaryRole = roles.length > 0 ? roles[0].role_name : "مستخدم"
      const branchName = roles.length > 0 && roles[0].branch_name ? roles[0].branch_name : "مركزي"

      let lastActive = "غير متاح"
      if (u.last_login) {
        lastActive = String(u.last_login).slice(0, 16)
      }

      return {
        id: String(u.id),
        userId: Number(u.id),
        personId: pId,
        name: u.full_name,
        username: u.username,
        email: u.email || "",
        phone: u.phone || "",
        role: primaryRole,
        roles: roles.map((r) => r.role_name),
        branch: branchName,
        lastActive,
        status: u.is_active ? "نشط" : "غير نشط",
        isActive: Boolean(u.is_active),
      }
    })
  }

  async getById(id: number) {
    const user = await db.get(
      `SELECT u.*, p.full_name, p.email, p.phone, p.birth_date, p.gender, p.person_type
       FROM users u
       JOIN persons p ON p.id = u.person_id
       WHERE u.id = ?`,
      [id],
    )

    if (!user) {
      throw new AppError("المستخدم غير موجود", 404)
    }

    const roles = await db.query(
      `SELECT r.id, r.name, r.scope, b.name as branch_name
       FROM person_roles pr
       JOIN roles r ON r.id = pr.role_id
       LEFT JOIN branches b ON b.id = pr.branch_id
       WHERE pr.person_id = ?`,
      [user.person_id],
    )

    return {
      id: String(user.id),
      userId: Number(user.id),
      personId: Number(user.person_id),
      username: user.username,
      name: user.full_name,
      email: user.email || "",
      phone: user.phone || "",
      roles,
      lastLogin: user.last_login,
      status: user.is_active ? "نشط" : "غير نشط",
      isActive: Boolean(user.is_active),
    }
  }

  async create(dto: CreateUserDto, user: AuthUser | undefined, req: Request) {
    assertAccountCode(req, dto.account_code)
    if (!dto.username || !dto.username.trim()) {
      throw new AppError("اسم المستخدم مطلوب", 400)
    }
    if (!dto.person_id) {
      throw new AppError("يجب تحديد شخص لإنشاء الحساب له", 400)
    }

    // Check duplicate username
    const existing = await db.get(`SELECT id FROM users WHERE username = ?`, [dto.username.trim()])
    if (existing) {
      throw new AppError("اسم المستخدم مستخدم بالفعل", 409)
    }

    // Check person exists
    const person = await db.get(`SELECT id FROM persons WHERE id = ?`, [dto.person_id])
    if (!person) {
      throw new AppError("الشخص غير موجود", 404)
    }

    // Check person already has user account
    const existingUser = await db.get(`SELECT id FROM users WHERE person_id = ?`, [dto.person_id])
    if (existingUser) {
      throw new AppError("هذا الشخص لديه حساب مستخدم بالفعل", 409)
    }

    const password = dto.password?.trim() || "password"
    const hash = await bcrypt.hash(password, 10)

    const res = await db.run(
      `INSERT INTO users (person_id, username, password_hash, is_active)
       VALUES (?, ?, ?, ?)`,
      [
        dto.person_id,
        dto.username.trim(),
        hash,
        dto.is_active !== undefined ? (dto.is_active ? 1 : 0) : 1,
      ],
    )

    const userId = res.lastInsertRowid

    // Assign role if provided
    if (dto.role_id) {
      await db.run(
        `INSERT INTO person_roles (person_id, role_id, branch_id) VALUES (?, ?, ?)`,
        [dto.person_id, dto.role_id, dto.branch_id || null],
      )
    }

    await logAudit("users", userId, "CREATE", user?.id, null, {
      username: dto.username,
      personId: dto.person_id,
    })

    return this.getById(userId)
  }

  async update(id: number, dto: UpdateUserDto, user?: AuthUser) {
    const existing = await db.get(`SELECT * FROM users WHERE id = ?`, [id])
    if (!existing) {
      throw new AppError("المستخدم غير موجود", 404)
    }

    const username = dto.username !== undefined ? dto.username.trim() : existing.username
    const is_active = dto.is_active !== undefined ? (dto.is_active ? 1 : 0) : existing.is_active

    if (dto.password && dto.password.trim()) {
      const hash = await bcrypt.hash(dto.password.trim(), 10)
      await db.run(
        `UPDATE users SET username = ?, password_hash = ?, is_active = ? WHERE id = ?`,
        [username, hash, is_active, id],
      )
    } else {
      await db.run(
        `UPDATE users SET username = ?, is_active = ? WHERE id = ?`,
        [username, is_active, id],
      )
    }

    if (dto.role_id) {
      await db.run(`DELETE FROM person_roles WHERE person_id = ?`, [existing.person_id])
      await db.run(
        `INSERT INTO person_roles (person_id, role_id, branch_id) VALUES (?, ?, ?)`,
        [existing.person_id, dto.role_id, dto.branch_id || null],
      )
    }

    await logAudit("users", id, "UPDATE", user?.id, existing, dto)
    return this.getById(id)
  }

  async delete(id: number, user?: AuthUser) {
    const existing = await db.get(`SELECT * FROM users WHERE id = ?`, [id])
    if (!existing) {
      throw new AppError("المستخدم غير موجود", 404)
    }

    await db.run(`DELETE FROM users WHERE id = ?`, [id])
    await logAudit("users", id, "DELETE", user?.id, existing, null)
    return { success: true }
  }
}

export const usersService = new UsersService()
