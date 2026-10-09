import { db } from "../../db/database.js"
import { AppError } from "../../middleware/error.middleware.js"
import { logAudit } from "../../middleware/audit.middleware.js"
import type { AuthUser } from "../../types/express.js"
import { getUserScope } from "../../middleware/rbac.middleware.js"

export interface CreateHalaqaDto {
  name: string
  level?: string
  branch_id: number
  is_active?: boolean
  teacher_ids?: number[]
}

export interface UpdateHalaqaDto {
  name?: string
  level?: string
  branch_id?: number
  is_active?: boolean
  teacher_ids?: number[]
}

export class HalaqatService {
  async getAll(user?: AuthUser, filters?: { branch_id?: number; level?: string; search?: string }) {
    const scope = getUserScope(user)

    let sql = `
      SELECT h.id, h.name, h.level, h.branch_id, h.is_active, h.created_at,
             b.name as branch_name,
             (SELECT COUNT(*) FROM halaqat_persons hp WHERE hp.halaqa_id = h.id AND hp.role_in_halaqa = 'student') as student_count
      FROM halaqat h
      JOIN branches b ON b.id = h.branch_id
      WHERE 1=1
    `
    const params: any[] = []

    // Scope restrictions
    if (scope.type === "branch" && scope.branchId) {
      sql += ` AND h.branch_id = ?`
      params.push(scope.branchId)
    } else if (scope.type === "teacher" && scope.halaqaIds) {
      if (scope.halaqaIds.length === 0) return []
      sql += ` AND h.id IN (${scope.halaqaIds.map(() => "?").join(",")})`
      params.push(...scope.halaqaIds)
    }

    if (filters?.branch_id) {
      sql += ` AND h.branch_id = ?`
      params.push(filters.branch_id)
    }

    if (filters?.level) {
      sql += ` AND h.level = ?`
      params.push(filters.level)
    }

    if (filters?.search) {
      sql += ` AND h.name LIKE ?`
      params.push(`%${filters.search.trim()}%`)
    }

    sql += ` ORDER BY h.id ASC`

    const halaqat = await db.query(sql, params)

    // Fetch teachers for each halaqa
    const teachersRows = await db.query(
      `SELECT hp.halaqa_id, p.id as person_id, p.full_name, p.phone
       FROM halaqat_persons hp
       JOIN persons p ON p.id = hp.person_id
       WHERE hp.role_in_halaqa = 'teacher'
       ORDER BY p.full_name ASC`,
    )

    const teachersByHalaqa: Record<number, any[]> = {}
    teachersRows.forEach((r: any) => {
      const hId = Number(r.halaqa_id)
      if (!teachersByHalaqa[hId]) teachersByHalaqa[hId] = []
      teachersByHalaqa[hId].push({
        id: Number(r.person_id),
        name: r.full_name,
        phone: r.phone,
      })
    })

    return halaqat.map((h: any) => {
      const id = Number(h.id)
      const teachers = teachersByHalaqa[id] || []
      return {
        id,
        name: h.name,
        branch: h.branch_name,
        branchId: Number(h.branch_id),
        level: h.level || "ثانوي",
        studentCount: Number(h.student_count),
        sheikh: teachers.length > 0 ? teachers[0].name : "غير محدد",
        sheikhs: teachers.map((t) => t.name),
        teacherDetails: teachers,
        status: h.is_active ? "نشط" : "متوقف",
        isActive: Boolean(h.is_active),
      }
    })
  }

  async getById(id: number, user?: AuthUser) {
    const halaqa = await db.get(
      `SELECT h.*, b.name as branch_name
       FROM halaqat h
       JOIN branches b ON b.id = h.branch_id
       WHERE h.id = ?`,
      [id],
    )

    if (!halaqa) {
      throw new AppError("الحلقة غير موجودة", 404)
    }

    // Verify access scope
    const scope = getUserScope(user)
    if (scope.type === "branch" && scope.branchId && halaqa.branch_id !== scope.branchId) {
      throw new AppError("غير مصرح بالوصول إلى حلقة في مقر آخر", 403)
    }
    if (scope.type === "teacher" && scope.halaqaIds && !scope.halaqaIds.includes(id)) {
      throw new AppError("غير مصرح بالوصول إلى هذه الحلقة", 403)
    }

    // Teachers
    const teachers = await db.query(
      `SELECT p.id, p.full_name, p.phone, p.email
       FROM halaqat_persons hp
       JOIN persons p ON p.id = hp.person_id
       WHERE hp.halaqa_id = ? AND hp.role_in_halaqa = 'teacher'`,
      [id],
    )

    // Students
    const students = await db.query(
      `SELECT p.id as person_id, p.full_name, p.phone, s.school_name, s.academic_level, s.enrollment_date, hp.created_at as joined_at
       FROM halaqat_persons hp
       JOIN persons p ON p.id = hp.person_id
       JOIN students s ON s.person_id = p.id
       WHERE hp.halaqa_id = ? AND hp.role_in_halaqa = 'student'
       ORDER BY p.full_name ASC`,
      [id],
    )

    return {
      id: Number(halaqa.id),
      name: halaqa.name,
      branch: halaqa.branch_name,
      branchId: Number(halaqa.branch_id),
      level: halaqa.level || "ثانوي",
      studentCount: students.length,
      sheikh: teachers.length > 0 ? teachers[0].full_name : "غير محدد",
      teachers,
      students,
      status: halaqa.is_active ? "نشط" : "متوقف",
      isActive: Boolean(halaqa.is_active),
    }
  }

  async create(dto: CreateHalaqaDto, user?: AuthUser) {
    if (!dto.name || !dto.name.trim()) {
      throw new AppError("اسم الحلقة مطلوب", 400)
    }
    if (!dto.branch_id) {
      throw new AppError("المقر مطلوب", 400)
    }

    // Verify scope: Branch admin can only create in their branch
    const scope = getUserScope(user)
    if (scope.type === "branch" && scope.branchId && scope.branchId !== dto.branch_id) {
      throw new AppError("يمكنك إنشاء حلقة في مقرك فقط", 403)
    }

    // Check duplicate in branch
    const existing = await db.get(
      `SELECT id FROM halaqat WHERE name = ? AND branch_id = ?`,
      [dto.name.trim(), dto.branch_id],
    )
    if (existing) {
      throw new AppError("توجد حلقة بهذا الاسم في هذا المقر مسبقاً", 409)
    }

    const res = await db.run(
      `INSERT INTO halaqat (name, level, branch_id, is_active)
       VALUES (?, ?, ?, ?)`,
      [
        dto.name.trim(),
        dto.level?.trim() || "ثانوي",
        dto.branch_id,
        dto.is_active !== undefined ? (dto.is_active ? 1 : 0) : 1,
      ],
    )

    const halaqaId = res.lastInsertRowid

    // Assign teachers if given (F4)
    if (dto.teacher_ids && dto.teacher_ids.length > 0) {
      for (const tId of dto.teacher_ids) {
        await this.assignTeacher(halaqaId, tId, user?.id)
      }
    }

    await logAudit("halaqat", halaqaId, "CREATE", user?.id, null, dto)
    return this.getById(halaqaId, user)
  }

  async update(id: number, dto: UpdateHalaqaDto, user?: AuthUser) {
    const existing = await db.get(`SELECT * FROM halaqat WHERE id = ?`, [id])
    if (!existing) {
      throw new AppError("الحلقة غير موجودة", 404)
    }

    const scope = getUserScope(user)
    if (scope.type === "branch" && scope.branchId && scope.branchId !== existing.branch_id) {
      throw new AppError("غير مصرح لك بتعديل حلقة في مقر آخر", 403)
    }

    const name = dto.name !== undefined ? dto.name.trim() : existing.name
    const level = dto.level !== undefined ? dto.level.trim() : existing.level
    const branch_id = dto.branch_id !== undefined ? dto.branch_id : existing.branch_id
    const is_active = dto.is_active !== undefined ? (dto.is_active ? 1 : 0) : existing.is_active

    await db.run(
      `UPDATE halaqat SET name = ?, level = ?, branch_id = ?, is_active = ? WHERE id = ?`,
      [name, level, branch_id, is_active, id],
    )

    if (dto.teacher_ids !== undefined) {
      await db.run(
        `DELETE FROM halaqat_persons WHERE halaqa_id = ? AND role_in_halaqa = 'teacher'`,
        [id],
      )
      for (const tId of dto.teacher_ids) {
        await this.assignTeacher(id, tId, user?.id)
      }
    }

    await logAudit("halaqat", id, "UPDATE", user?.id, existing, dto)
    return this.getById(id, user)
  }

  async delete(id: number, user?: AuthUser) {
    const existing = await db.get(`SELECT * FROM halaqat WHERE id = ?`, [id])
    if (!existing) {
      throw new AppError("الحلقة غير موجودة", 404)
    }

    const scope = getUserScope(user)
    if (scope.type === "branch" && scope.branchId && scope.branchId !== existing.branch_id) {
      throw new AppError("غير مصرح لك بحذف حلقة في مقر آخر", 403)
    }

    await db.run(`DELETE FROM halaqat WHERE id = ?`, [id])
    await logAudit("halaqat", id, "DELETE", user?.id, existing, null)
    return { success: true }
  }

  // F4: Assign teacher to halaqa
  async assignTeacher(halaqaId: number, teacherPersonId: number, currentUserId?: number) {
    const exists = await db.get(
      `SELECT id FROM halaqat_persons WHERE halaqa_id = ? AND person_id = ? AND role_in_halaqa = 'teacher'`,
      [halaqaId, teacherPersonId],
    )
    if (exists) return

    await db.run(
      `INSERT INTO halaqat_persons (halaqa_id, person_id, role_in_halaqa) VALUES (?, ?, 'teacher')`,
      [halaqaId, teacherPersonId],
    )

    // Notify teacher
    const teacherUser = await db.get(`SELECT id FROM users WHERE person_id = ?`, [teacherPersonId])
    if (teacherUser) {
      const halaqa = await db.get(`SELECT name FROM halaqat WHERE id = ?`, [halaqaId])
      await db.run(
        `INSERT INTO notifications (user_id, title, body, type, is_read, related_entity_type, related_entity_id)
         VALUES (?, ?, ?, 'assignment', 0, 'halaqa', ?)`,
        [
          teacherUser.id,
          "تم تعيينك في حلقة جديدة",
          `تم تعيينك للإشراف على ${halaqa?.name || "حلقة قرآنية"}`,
          halaqaId,
        ],
      )
    }

    await logAudit("halaqat_persons", halaqaId, "CREATE", currentUserId, null, {
      halaqaId,
      teacherPersonId,
      role: "teacher",
    })
  }

  async removeTeacher(halaqaId: number, teacherPersonId: number, currentUserId?: number) {
    await db.run(
      `DELETE FROM halaqat_persons WHERE halaqa_id = ? AND person_id = ? AND role_in_halaqa = 'teacher'`,
      [halaqaId, teacherPersonId],
    )
    await logAudit("halaqat_persons", halaqaId, "DELETE", currentUserId, { halaqaId, teacherPersonId }, null)
  }

  // F5 & F12: Enroll student into halaqa and notify sheikh
  async enrollStudent(halaqaId: number, studentPersonId: number, currentUserId?: number) {
    const exists = await db.get(
      `SELECT id FROM halaqat_persons WHERE halaqa_id = ? AND person_id = ? AND role_in_halaqa = 'student'`,
      [halaqaId, studentPersonId],
    )
    if (exists) return

    await db.run(
      `INSERT INTO halaqat_persons (halaqa_id, person_id, role_in_halaqa) VALUES (?, ?, 'student')`,
      [halaqaId, studentPersonId],
    )

    // F12: Notify the Sheikh(s) of this halaqa!
    const teachers = await db.query(
      `SELECT u.id as user_id, p.full_name as teacher_name
       FROM halaqat_persons hp
       JOIN persons p ON p.id = hp.person_id
       JOIN users u ON u.person_id = p.id
       WHERE hp.halaqa_id = ? AND hp.role_in_halaqa = 'teacher'`,
      [halaqaId],
    )

    const studentPerson = await db.get(`SELECT full_name FROM persons WHERE id = ?`, [studentPersonId])
    const halaqa = await db.get(`SELECT name FROM halaqat WHERE id = ?`, [halaqaId])

    for (const t of teachers) {
      await db.run(
        `INSERT INTO notifications (user_id, title, body, type, is_read, related_entity_type, related_entity_id)
         VALUES (?, ?, ?, 'student_added', 0, 'student', ?)`,
        [
          t.user_id,
          "أضيف طالب جديد إلى حلقتك",
          `تم تسجيل الطالب ${studentPerson?.full_name || ""} في ${halaqa?.name || "حلقتك"}`,
          studentPersonId,
        ],
      )
    }

    await logAudit("halaqat_persons", halaqaId, "CREATE", currentUserId, null, {
      halaqaId,
      studentPersonId,
      role: "student",
    })
  }

  async unenrollStudent(halaqaId: number, studentPersonId: number, currentUserId?: number) {
    await db.run(
      `DELETE FROM halaqat_persons WHERE halaqa_id = ? AND person_id = ? AND role_in_halaqa = 'student'`,
      [halaqaId, studentPersonId],
    )
    await logAudit("halaqat_persons", halaqaId, "DELETE", currentUserId, { halaqaId, studentPersonId }, null)
  }
}

export const halaqatService = new HalaqatService()
