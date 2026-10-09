import { db } from "../../db/database.js"
import { AppError } from "../../middleware/error.middleware.js"
import { logAudit } from "../../middleware/audit.middleware.js"
import { MAX_ADMINS_PER_BRANCH } from "../../config/constants.js"

export interface CreateBranchDto {
  name: string
  location?: string
  phone?: string
  is_active?: boolean
  admin_ids?: number[]
}

export interface UpdateBranchDto {
  name?: string
  location?: string
  phone?: string
  is_active?: boolean
  admin_ids?: number[]
}

export class BranchesService {
  async getAll() {
    const branches = await db.query(
      `SELECT b.id, b.name, b.location, b.phone, b.is_active, b.created_at,
              (SELECT COUNT(*) FROM students s WHERE s.branch_id = b.id) as student_count,
              (SELECT COUNT(*) FROM halaqat h WHERE h.branch_id = b.id) as halaqa_count,
              (SELECT COUNT(*) FROM branch_admins ba WHERE ba.branch_id = b.id) as admin_count
       FROM branches b
       ORDER BY b.id ASC`,
    )

    // Attach admin details to each branch
    const branchAdmins = await db.query(
      `SELECT ba.branch_id, p.id as person_id, p.full_name, p.phone, p.email
       FROM branch_admins ba
       JOIN persons p ON p.id = ba.person_id
       ORDER BY ba.assigned_at ASC`,
    )

    const adminsByBranch: Record<number, any[]> = {}
    branchAdmins.forEach((ba: any) => {
      const bId = Number(ba.branch_id)
      if (!adminsByBranch[bId]) adminsByBranch[bId] = []
      adminsByBranch[bId].push({
        id: Number(ba.person_id),
        name: ba.full_name,
        phone: ba.phone,
        email: ba.email,
      })
    })

    return branches.map((b: any) => {
      const id = Number(b.id)
      const admins = adminsByBranch[id] || []
      return {
        id,
        name: b.name,
        location: b.location || "",
        phone: b.phone || "",
        studentCount: Number(b.student_count),
        adminCount: admins.length,
        admins: admins.map((a) => a.name),
        adminDetails: admins,
        halaqaCount: Number(b.halaqa_count),
        status: b.is_active ? "نشط" : "غير نشط",
        isActive: Boolean(b.is_active),
      }
    })
  }

  async getById(id: number) {
    const branch = await db.get(
      `SELECT b.id, b.name, b.location, b.phone, b.is_active, b.created_at,
              (SELECT COUNT(*) FROM students s WHERE s.branch_id = b.id) as student_count,
              (SELECT COUNT(*) FROM halaqat h WHERE h.branch_id = b.id) as halaqa_count
       FROM branches b
       WHERE b.id = ?`,
      [id],
    )

    if (!branch) {
      throw new AppError("المقر غير موجود", 404)
    }

    const admins = await db.query(
      `SELECT p.id, p.full_name, p.phone, p.email, ba.assigned_at
       FROM branch_admins ba
       JOIN persons p ON p.id = ba.person_id
       WHERE ba.branch_id = ?
       ORDER BY ba.assigned_at ASC`,
      [id],
    )

    const halaqat = await db.query(
      `SELECT h.id, h.name, h.level, h.is_active,
              (SELECT COUNT(*) FROM halaqat_persons hp WHERE hp.halaqa_id = h.id AND hp.role_in_halaqa = 'student') as student_count,
              (SELECT p.full_name FROM halaqat_persons hp JOIN persons p ON p.id = hp.person_id WHERE hp.halaqa_id = h.id AND hp.role_in_halaqa = 'teacher' LIMIT 1) as teacher_name
       FROM halaqat h
       WHERE h.branch_id = ?
       ORDER BY h.id ASC`,
      [id],
    )

    return {
      id: Number(branch.id),
      name: branch.name,
      location: branch.location || "",
      phone: branch.phone || "",
      studentCount: Number(branch.student_count),
      adminCount: admins.length,
      admins: admins.map((a: any) => a.full_name),
      adminDetails: admins,
      halaqaCount: Number(branch.halaqa_count),
      halaqat,
      status: branch.is_active ? "نشط" : "غير نشط",
      isActive: Boolean(branch.is_active),
    }
  }

  async create(dto: CreateBranchDto, currentUserId?: number) {
    if (!dto.name || !dto.name.trim()) {
      throw new AppError("اسم المقر مطلوب", 400)
    }

    // Check duplicate name
    const existing = await db.get(`SELECT id FROM branches WHERE name = ?`, [dto.name.trim()])
    if (existing) {
      throw new AppError("يوجد مقر بهذا الاسم مسبقاً", 409)
    }

    // Check admin limit validation
    if (dto.admin_ids && dto.admin_ids.length > MAX_ADMINS_PER_BRANCH) {
      throw new AppError(`الحد الأقصى لمسؤولي المقر هو ${MAX_ADMINS_PER_BRANCH} مسؤولين`, 400)
    }

    const res = await db.run(
      `INSERT INTO branches (name, location, phone, is_active)
       VALUES (?, ?, ?, ?)`,
      [
        dto.name.trim(),
        dto.location?.trim() || null,
        dto.phone?.trim() || null,
        dto.is_active !== undefined ? (dto.is_active ? 1 : 0) : 1,
      ],
    )

    const branchId = res.lastInsertRowid

    // Assign initial admins if provided
    if (dto.admin_ids && dto.admin_ids.length > 0) {
      for (const personId of dto.admin_ids) {
        await this.addAdmin(branchId, personId, currentUserId)
      }
    }

    await logAudit("branches", branchId, "CREATE", currentUserId, null, dto)
    return this.getById(branchId)
  }

  async update(id: number, dto: UpdateBranchDto, currentUserId?: number) {
    const existing = await db.get(`SELECT * FROM branches WHERE id = ?`, [id])
    if (!existing) {
      throw new AppError("المقر غير موجود", 404)
    }

    if (dto.name && dto.name.trim() !== existing.name) {
      const duplicate = await db.get(`SELECT id FROM branches WHERE name = ? AND id <> ?`, [
        dto.name.trim(),
        id,
      ])
      if (duplicate) {
        throw new AppError("يوجد مقر آخر بهذا الاسم", 409)
      }
    }

    const name = dto.name !== undefined ? dto.name.trim() : existing.name
    const location = dto.location !== undefined ? dto.location.trim() : existing.location
    const phone = dto.phone !== undefined ? dto.phone.trim() : existing.phone
    const is_active = dto.is_active !== undefined ? (dto.is_active ? 1 : 0) : existing.is_active

    await db.run(
      `UPDATE branches SET name = ?, location = ?, phone = ?, is_active = ? WHERE id = ?`,
      [name, location, phone, is_active, id],
    )

    // If admin_ids is provided, sync admins
    if (dto.admin_ids !== undefined) {
      if (dto.admin_ids.length > MAX_ADMINS_PER_BRANCH) {
        throw new AppError(`الحد الأقصى لمسؤولي المقر هو ${MAX_ADMINS_PER_BRANCH} مسؤولين`, 400)
      }
      // Remove current admins and re-add
      await db.run(`DELETE FROM branch_admins WHERE branch_id = ?`, [id])
      for (const pId of dto.admin_ids) {
        await db.run(
          `INSERT INTO branch_admins (branch_id, person_id) VALUES (?, ?)`,
          [id, pId],
        )
      }
    }

    await logAudit("branches", id, "UPDATE", currentUserId, existing, dto)
    return this.getById(id)
  }

  async delete(id: number, currentUserId?: number) {
    const existing = await db.get(`SELECT * FROM branches WHERE id = ?`, [id])
    if (!existing) {
      throw new AppError("المقر غير موجود", 404)
    }

    // Check if branch has students
    const studentCountRow = await db.get(
      `SELECT COUNT(*) as count FROM students WHERE branch_id = ?`,
      [id],
    )
    if (Number(studentCountRow?.count) > 0) {
      throw new AppError("لا يمكن حذف مقر يحتوي على طلاب مسجلين. قم بنقلهم أولاً.", 400)
    }

    await db.run(`DELETE FROM branches WHERE id = ?`, [id])
    await logAudit("branches", id, "DELETE", currentUserId, existing, null)
    return { success: true }
  }

  // F8: Branch Admins Management
  async addAdmin(branchId: number, personId: number, currentUserId?: number) {
    // 1. Verify branch exists
    const branch = await db.get(`SELECT id FROM branches WHERE id = ?`, [branchId])
    if (!branch) {
      throw new AppError("المقر غير موجود", 404)
    }

    // 2. Verify person exists
    const person = await db.get(`SELECT id, full_name FROM persons WHERE id = ?`, [personId])
    if (!person) {
      throw new AppError("الشخص غير موجود", 404)
    }

    // 3. Verify maximum 3 admins limit
    const currentAdmins = await db.get(
      `SELECT COUNT(*) as count FROM branch_admins WHERE branch_id = ?`,
      [branchId],
    )
    if (Number(currentAdmins?.count) >= MAX_ADMINS_PER_BRANCH) {
      throw new AppError(
        `تم بلوغ الحد الأقصى لمسؤولي المقر (${MAX_ADMINS_PER_BRANCH} مسؤولين كحد أقصى)`,
        400,
      )
    }

    // 4. Check if already assigned
    const alreadyAssigned = await db.get(
      `SELECT id FROM branch_admins WHERE branch_id = ? AND person_id = ?`,
      [branchId, personId],
    )
    if (alreadyAssigned) {
      throw new AppError("هذا الشخص معيّن كمسؤول لهذا المقر بالفعل", 409)
    }

    await db.run(
      `INSERT INTO branch_admins (branch_id, person_id) VALUES (?, ?)`,
      [branchId, personId],
    )

    // Ensure person has branch role "مسؤول مقر"
    const branchRole = await db.get(`SELECT id FROM roles WHERE name = 'مسؤول مقر' LIMIT 1`)
    if (branchRole) {
      const hasRole = await db.get(
        `SELECT id FROM person_roles WHERE person_id = ? AND role_id = ? AND branch_id = ?`,
        [personId, branchRole.id, branchId],
      )
      if (!hasRole) {
        await db.run(
          `INSERT INTO person_roles (person_id, role_id, branch_id) VALUES (?, ?, ?)`,
          [personId, branchRole.id, branchId],
        )
      }
    }

    await logAudit("branch_admins", branchId, "CREATE", currentUserId, null, {
      branchId,
      personId,
    })

    return this.getById(branchId)
  }

  async removeAdmin(branchId: number, personId: number, currentUserId?: number) {
    const existing = await db.get(
      `SELECT id FROM branch_admins WHERE branch_id = ? AND person_id = ?`,
      [branchId, personId],
    )
    if (!existing) {
      throw new AppError("المسؤول غير معين لهذا المقر", 404)
    }

    await db.run(`DELETE FROM branch_admins WHERE branch_id = ? AND person_id = ?`, [
      branchId,
      personId,
    ])

    await logAudit("branch_admins", branchId, "DELETE", currentUserId, { branchId, personId }, null)
    return this.getById(branchId)
  }
}

export const branchesService = new BranchesService()
