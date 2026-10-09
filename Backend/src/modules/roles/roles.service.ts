import { db } from "../../db/database.js"
import { AppError } from "../../middleware/error.middleware.js"
import { logAudit } from "../../middleware/audit.middleware.js"
import type { AuthUser } from "../../types/express.js"

export interface AssignRoleDto {
  person_id: number
  role_id: number
  branch_id?: number | null
}

export class RolesService {
  async getAll() {
    const roles = await db.query(
      `SELECT r.id, r.name, r.scope, r.is_active,
              (SELECT COUNT(DISTINCT pr.person_id) FROM person_roles pr WHERE pr.role_id = r.id) as user_count
       FROM roles r
       ORDER BY r.id ASC`,
    )

    return roles.map((r: any) => {
      let scopeLabel = "مركزي"
      if (r.scope === "branch") scopeLabel = "خاص بالمقر"
      else if (r.name.includes("الشباب")) scopeLabel = "مركزي وفروع"

      let accessLevel = "مخصص"
      if (r.name.includes("التنظيم") || r.name.includes("رئيس الشعبة")) accessLevel = "كامل"
      else if (r.scope === "branch") accessLevel = "مقيد"

      return {
        id: String(r.id),
        roleId: Number(r.id),
        name: r.name,
        scope: scopeLabel,
        rawScope: r.scope,
        userCount: Number(r.user_count),
        accessLevel,
        status: r.is_active ? "نشط" : "غير نشط",
      }
    })
  }

  async getById(id: number) {
    const role = await db.get(`SELECT * FROM roles WHERE id = ?`, [id])
    if (!role) {
      throw new AppError("الدور غير موجود", 404)
    }

    const assignedPersons = await db.query(
      `SELECT p.id, p.full_name, p.phone, p.email, b.name as branch_name, pr.created_at
       FROM person_roles pr
       JOIN persons p ON p.id = pr.person_id
       LEFT JOIN branches b ON b.id = pr.branch_id
       WHERE pr.role_id = ?
       ORDER BY p.full_name ASC`,
      [id],
    )

    return {
      id: String(role.id),
      roleId: Number(role.id),
      name: role.name,
      scope: role.scope,
      userCount: assignedPersons.length,
      assignedPersons,
      status: role.is_active ? "نشط" : "غير نشط",
    }
  }

  async create(name: string, scope: "central" | "branch", user?: AuthUser) {
    if (!name || !name.trim()) {
      throw new AppError("اسم الدور مطلوب", 400)
    }

    const res = await db.run(
      `INSERT INTO roles (name, scope, is_active) VALUES (?, ?, 1)`,
      [name.trim(), scope],
    )

    const roleId = res.lastInsertRowid
    await logAudit("roles", roleId, "CREATE", user?.id, null, { name, scope })

    return this.getById(roleId)
  }

  async assignRole(dto: AssignRoleDto, user?: AuthUser) {
    const person = await db.get(`SELECT id FROM persons WHERE id = ?`, [dto.person_id])
    if (!person) {
      throw new AppError("الشخص غير موجود", 404)
    }

    const role = await db.get(`SELECT id, scope, name FROM roles WHERE id = ?`, [dto.role_id])
    if (!role) {
      throw new AppError("الدور غير موجود", 404)
    }

    const branchId = role.scope === "branch" ? dto.branch_id ?? null : null

    const exists = await db.get(
      `SELECT id FROM person_roles WHERE person_id = ? AND role_id = ? AND (branch_id = ? OR (branch_id IS NULL AND ? IS NULL))`,
      [dto.person_id, dto.role_id, branchId, branchId],
    )
    if (exists) {
      throw new AppError("الشخص يحمل هذا الدور بالفعل", 409)
    }

    await db.run(
      `INSERT INTO person_roles (person_id, role_id, branch_id) VALUES (?, ?, ?)`,
      [dto.person_id, dto.role_id, branchId],
    )

    // If assigned "مسؤول مقر", check if should also be in branch_admins
    if (role.name === "مسؤول مقر" && branchId) {
      const alreadyAdmin = await db.get(
        `SELECT id FROM branch_admins WHERE branch_id = ? AND person_id = ?`,
        [branchId, dto.person_id],
      )
      if (!alreadyAdmin) {
        // Enforce max 3 limit
        const count = await db.get(
          `SELECT COUNT(*) as count FROM branch_admins WHERE branch_id = ?`,
          [branchId],
        )
        if (Number(count?.count) < 3) {
          await db.run(
            `INSERT INTO branch_admins (branch_id, person_id) VALUES (?, ?)`,
            [branchId, dto.person_id],
          )
        }
      }
    }

    await logAudit("person_roles", dto.person_id, "CREATE", user?.id, null, dto)
    return { success: true, message: "تم تعيين الدور بنجاح" }
  }

  async unassignRole(personId: number, roleId: number, branchId?: number, user?: AuthUser) {
    if (branchId) {
      await db.run(
        `DELETE FROM person_roles WHERE person_id = ? AND role_id = ? AND branch_id = ?`,
        [personId, roleId, branchId],
      )
    } else {
      await db.run(
        `DELETE FROM person_roles WHERE person_id = ? AND role_id = ?`,
        [personId, roleId],
      )
    }

    await logAudit("person_roles", personId, "DELETE", user?.id, { personId, roleId, branchId }, null)
    return { success: true, message: "تمت إزالة الدور بنجاح" }
  }
}

export const rolesService = new RolesService()
