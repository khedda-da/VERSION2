import { db } from "../../db/database.js"
import { AppError } from "../../middleware/error.middleware.js"
import { logAudit } from "../../middleware/audit.middleware.js"
import { calculateAge, formatDateArabic, normalizeArabic } from "../../utils/arabic.utils.js"
import { ARABIC_TO_ACADEMIC_LEVEL, ACADEMIC_LEVELS_ARABIC } from "../../config/constants.js"
import type { AuthUser } from "../../types/express.js"
import { getUserScope } from "../../middleware/rbac.middleware.js"
import { halaqatService } from "../halaqat/halaqat.service.js"
import { generateExcelBuffer, generateCsvBuffer, generatePdfBuffer } from "../../utils/export.utils.js"

export interface StudentFilterParams {
  search?: string
  name?: string
  school?: string
  level?: string
  branch?: string
  branch_id?: number
  halaqa?: string
  halaqa_id?: number
  sheikh?: string
  sheikh_id?: number
  gender?: string
  date_from?: string
  date_to?: string
  min_age?: number | string
  max_age?: number | string
  status?: string
}

export interface CreateStudentDto {
  name: string
  phone?: string
  email?: string
  birth_date?: string
  gender?: "male" | "female" | "ذكر" | "أنثى"
  school_name?: string
  academic_level?: string
  enrollment_date?: string
  branch_id?: number
  branch_name?: string
  halaqa_id?: number
  halaqa_name?: string
  person_id?: number // if existing person
}

export interface UpdateStudentDto {
  name?: string
  phone?: string
  email?: string
  birth_date?: string
  gender?: "male" | "female" | "ذكر" | "أنثى"
  school_name?: string
  academic_level?: string
  enrollment_date?: string
  branch_id?: number
  halaqa_id?: number
  status?: string
}

export class StudentsService {
  /**
   * Advanced multi-criteria search (F10) respecting permissions (F13)
   */
  async searchStudents(filters: StudentFilterParams = {}, user?: AuthUser) {
    const scope = getUserScope(user)

    let sql = `
      SELECT 
        s.id AS student_id,
        p.id AS person_id,
        p.full_name,
        p.phone,
        p.email,
        p.birth_date,
        p.gender,
        s.school_name,
        s.academic_level,
        s.enrollment_date,
        b.id AS branch_id,
        b.name AS branch_name,
        h.id AS halaqa_id,
        h.name AS halaqa_name,
        h.level AS halaqa_level,
        tp.id AS teacher_person_id,
        tp.full_name AS teacher_name
      FROM students s
      JOIN persons p ON p.id = s.person_id
      JOIN branches b ON b.id = s.branch_id
      LEFT JOIN halaqat_persons hp_s ON hp_s.person_id = p.id AND hp_s.role_in_halaqa = 'student'
      LEFT JOIN halaqat h ON h.id = hp_s.halaqa_id
      LEFT JOIN halaqat_persons hp_t ON hp_t.halaqa_id = h.id AND hp_t.role_in_halaqa = 'teacher'
      LEFT JOIN persons tp ON tp.id = hp_t.person_id
      WHERE 1=1
    `
    const params: any[] = []

    // 1. RBAC Scope (F13)
    if (scope.type === "branch" && scope.branchId) {
      sql += ` AND s.branch_id = ?`
      params.push(scope.branchId)
    } else if (scope.type === "teacher" && scope.halaqaIds) {
      if (scope.halaqaIds.length === 0) return []
      sql += ` AND h.id IN (${scope.halaqaIds.map(() => "?").join(",")})`
      params.push(...scope.halaqaIds)
    }

    // 2. Branch filter
    if (filters.branch_id) {
      sql += ` AND s.branch_id = ?`
      params.push(filters.branch_id)
    } else if (filters.branch && filters.branch.trim()) {
      sql += ` AND b.name LIKE ?`
      params.push(`%${filters.branch.trim()}%`)
    }

    // 3. Halaqa filter
    if (filters.halaqa_id) {
      sql += ` AND h.id = ?`
      params.push(filters.halaqa_id)
    } else if (filters.halaqa && filters.halaqa.trim()) {
      sql += ` AND h.name LIKE ?`
      params.push(`%${filters.halaqa.trim()}%`)
    }

    // 4. Sheikh filter
    if (filters.sheikh_id) {
      sql += ` AND tp.id = ?`
      params.push(filters.sheikh_id)
    } else if (filters.sheikh && filters.sheikh.trim()) {
      sql += ` AND tp.full_name LIKE ?`
      params.push(`%${filters.sheikh.trim()}%`)
    }

    // 5. Academic level filter
    if (filters.level && filters.level.trim()) {
      const normalizedLevel = ARABIC_TO_ACADEMIC_LEVEL[filters.level.trim()] || filters.level.trim()
      sql += ` AND s.academic_level = ?`
      params.push(normalizedLevel)
    }

    // 6. School filter
    if (filters.school && filters.school.trim()) {
      sql += ` AND s.school_name LIKE ?`
      params.push(`%${filters.school.trim()}%`)
    }

    // 7. Student Name / Search filter
    const searchVal = filters.name || filters.search
    if (searchVal && searchVal.trim()) {
      const q = `%${searchVal.trim()}%`
      sql += ` AND (p.full_name LIKE ? OR s.school_name LIKE ?)`
      params.push(q, q)
    }

    // 8. Gender filter
    if (filters.gender && filters.gender.trim()) {
      const g =
        filters.gender === "ذكر"
          ? "male"
          : filters.gender === "أنثى"
            ? "female"
            : filters.gender.trim()
      sql += ` AND p.gender = ?`
      params.push(g)
    }

    // 9. Enrollment Date range
    if (filters.date_from && filters.date_from.trim()) {
      sql += ` AND s.enrollment_date >= ?`
      params.push(filters.date_from.trim())
    }
    if (filters.date_to && filters.date_to.trim()) {
      sql += ` AND s.enrollment_date <= ?`
      params.push(filters.date_to.trim())
    }

    sql += ` ORDER BY s.id DESC`

    const rows = await db.query(sql, params)

    // Deduplicate any rows due to multiple teachers and format for frontend
    const map = new Map<number, any>()
    const minAge = filters.min_age !== undefined && filters.min_age !== "" ? Number(filters.min_age) : null
    const maxAge = filters.max_age !== undefined && filters.max_age !== "" ? Number(filters.max_age) : null

    for (const r of rows) {
      const sId = Number(r.student_id)
      const age = calculateAge(r.birth_date)

      // Age filter
      if (minAge !== null && !isNaN(minAge) && age < minAge) continue
      if (maxAge !== null && !isNaN(maxAge) && age > maxAge) continue

      if (!map.has(sId)) {
        const parts = (r.full_name || "").trim().split(/\s+/)
        const initials =
          parts.length > 1
            ? `${parts[0][0]} ${parts[1][0]}`
            : (r.full_name || "").slice(0, 2)

        const levelAr =
          ACADEMIC_LEVELS_ARABIC[r.academic_level as keyof typeof ACADEMIC_LEVELS_ARABIC] ||
          r.academic_level ||
          "ثانوي"

        map.set(sId, {
          id: `DJ-${1000 + sId}`,
          studentId: sId,
          personId: Number(r.person_id),
          name: r.full_name,
          initials,
          age,
          school: r.school_name || "غير محدد",
          level: levelAr,
          academicLevelRaw: r.academic_level,
          branch: r.branch_name,
          branchId: Number(r.branch_id),
          halaqa: r.halaqa_name || "غير مسجل",
          halaqaId: r.halaqa_id ? Number(r.halaqa_id) : null,
          sheikh: r.teacher_name || "غير محدد",
          sheikhId: r.teacher_person_id ? Number(r.teacher_person_id) : null,
          date: formatDateArabic(r.enrollment_date),
          enrollmentDateRaw: r.enrollment_date,
          status: "نشط",
          phone: r.phone || "",
          email: r.email || "",
          birthDate: r.birth_date || "",
          gender: r.gender === "male" ? "ذكر" : r.gender === "female" ? "أنثى" : "",
          genderRaw: r.gender,
        })
      } else {
        // Append extra teacher if not already present
        const existing = map.get(sId)
        if (r.teacher_name && !existing.sheikh.includes(r.teacher_name)) {
          existing.sheikh += `, ${r.teacher_name}`
        }
      }
    }

    return Array.from(map.values())
  }

  async getById(id: number | string, user?: AuthUser) {
    const rawId = typeof id === "string" && id.startsWith("DJ-") ? parseInt(id.replace("DJ-", ""), 10) - 1000 : Number(id)

    const list = await this.searchStudents({}, user)
    const found = list.find((s) => s.studentId === rawId || s.id === id)

    if (!found) {
      throw new AppError("الطالب غير موجود أو ليس لديك صلاحية للاطلاع عليه", 404)
    }

    return found
  }

  /**
   * Add a new student (F9) and notify the sheikh (F12)
   */
  async create(dto: CreateStudentDto, user?: AuthUser) {
    if (!dto.name || !dto.name.trim()) {
      throw new AppError("اسم الطالب مطلوب", 400)
    }

    // Determine branch
    let branchId = dto.branch_id
    if (!branchId && dto.branch_name) {
      const b = await db.get(`SELECT id FROM branches WHERE name = ?`, [dto.branch_name.trim()])
      if (b) branchId = Number(b.id)
    }

    // Scope check: Branch admin can only add to their branch
    const scope = getUserScope(user)
    if (scope.type === "branch" && scope.branchId) {
      if (branchId && branchId !== scope.branchId) {
        throw new AppError("لا يمكنك إضافة طالب إلا في مقرك المحدد", 403)
      }
      branchId = scope.branchId
    }

    if (!branchId) {
      // Default to first active branch
      const firstBranch = await db.get(`SELECT id FROM branches WHERE is_active = 1 LIMIT 1`)
      branchId = firstBranch ? Number(firstBranch.id) : 1
    }

    // Determine Halaqa
    let halaqaId = dto.halaqa_id
    if (!halaqaId && dto.halaqa_name) {
      const h = await db.get(`SELECT id FROM halaqat WHERE name = ?`, [dto.halaqa_name.trim()])
      if (h) halaqaId = Number(h.id)
    }

    // Sheikh adding student can only add to their halaqa
    if (scope.type === "teacher" && scope.halaqaIds) {
      if (halaqaId && !scope.halaqaIds.includes(halaqaId)) {
        throw new AppError("لا يمكنك إضافة طالب إلا في حلقاتك المشرف عليها", 403)
      }
      if (!halaqaId && scope.halaqaIds.length > 0) {
        halaqaId = scope.halaqaIds[0]
      }
    }

    // Create or find person
    let personId = dto.person_id
    if (!personId) {
      const gender =
        dto.gender === "ذكر" ? "male" : dto.gender === "أنثى" ? "female" : dto.gender || "male"
      if (!dto.phone?.trim() && !dto.email?.trim()) {
        throw new AppError("يجب توفير رقم الهاتف أو البريد الإلكتروني على الأقل", 400)
      }
      const res = await db.run(
        `INSERT INTO persons (full_name, phone, email, birth_date, gender, person_type)
         VALUES (?, ?, ?, ?, ?, 'student')`,
        [
          dto.name.trim(),
          dto.phone?.trim() || null,
          dto.email?.trim() || null,
          dto.birth_date || "2010-01-01",
          gender,
        ],
      )
      personId = res.lastInsertRowid
    }

    // Level
    const level =
      ARABIC_TO_ACADEMIC_LEVEL[dto.academic_level?.trim() || ""] ||
      dto.academic_level ||
      "secondary"
    const enrollmentDate = dto.enrollment_date || new Date().toISOString().slice(0, 10)
    const schoolName = dto.school_name?.trim() || "ثانوية ابن خلدون"

    const studentRes = await db.run(
      `INSERT INTO students (person_id, school_name, academic_level, enrollment_date, branch_id)
       VALUES (?, ?, ?, ?, ?)`,
      [personId, schoolName, level, enrollmentDate, branchId],
    )

    const studentId = studentRes.lastInsertRowid

    // Enroll in halaqa if selected, triggering F12 notification!
    if (halaqaId) {
      await halaqatService.enrollStudent(halaqaId, personId, user?.id)
    }

    await logAudit("students", studentId, "CREATE", user?.id, null, dto)

    return this.getById(studentId, user)
  }

  async update(id: number | string, dto: UpdateStudentDto, user?: AuthUser) {
    const student = await this.getById(id, user)
    const studentId = student.studentId
    const personId = student.personId

    // Update person
    const fullName = dto.name !== undefined ? dto.name.trim() : student.name
    const phone = dto.phone !== undefined ? dto.phone.trim() : student.phone
    const email = dto.email !== undefined ? dto.email.trim() : student.email
    const birthDate = dto.birth_date !== undefined ? dto.birth_date : student.birthDate
    const gender =
      dto.gender !== undefined
        ? dto.gender === "ذكر"
          ? "male"
          : dto.gender === "أنثى"
            ? "female"
            : dto.gender
        : student.genderRaw

    await db.run(
      `UPDATE persons SET full_name = ?, phone = ?, email = ?, birth_date = ?, gender = ? WHERE id = ?`,
      [fullName, phone, email, birthDate, gender, personId],
    )

    // Update student
    const schoolName = dto.school_name !== undefined ? dto.school_name.trim() : student.school
    const level =
      dto.academic_level !== undefined
        ? ARABIC_TO_ACADEMIC_LEVEL[dto.academic_level] || dto.academic_level
        : student.academicLevelRaw
    const branchId = dto.branch_id !== undefined ? dto.branch_id : student.branchId
    const enrollmentDate =
      dto.enrollment_date !== undefined ? dto.enrollment_date : student.enrollmentDateRaw

    await db.run(
      `UPDATE students SET school_name = ?, academic_level = ?, branch_id = ?, enrollment_date = ? WHERE id = ?`,
      [schoolName, level, branchId, enrollmentDate, studentId],
    )

    // Update halaqa enrollment if changed
    if (dto.halaqa_id !== undefined && dto.halaqa_id !== student.halaqaId) {
      if (student.halaqaId) {
        await halaqatService.unenrollStudent(student.halaqaId, personId, user?.id)
      }
      if (dto.halaqa_id) {
        await halaqatService.enrollStudent(dto.halaqa_id, personId, user?.id)
      }
    }

    await logAudit("students", studentId, "UPDATE", user?.id, student, dto)
    return this.getById(studentId, user)
  }

  async delete(id: number | string, user?: AuthUser) {
    const student = await this.getById(id, user)
    const studentId = student.studentId
    const personId = student.personId

    await db.run(`DELETE FROM students WHERE id = ?`, [studentId])
    await db.run(`DELETE FROM persons WHERE id = ?`, [personId])

    await logAudit("students", studentId, "DELETE", user?.id, student, null)
    return { success: true }
  }

  /**
   * Export search results (F11) to Excel (.xlsx), CSV, or PDF
   */
  async exportStudents(
    filters: StudentFilterParams,
    format: "xlsx" | "csv" | "pdf",
    user?: AuthUser,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const students = await this.searchStudents(filters, user)

    const headers = [
      "المعرف",
      "الاسم الكامل",
      "المستوى",
      "المؤسسة",
      "المقر",
      "الحلقة",
      "الشيخ",
      "تاريخ التسجيل",
      "الهاتف",
      "الجنس",
    ]

    const rows = students.map((s) => [
      s.id,
      s.name,
      s.level,
      s.school,
      s.branch,
      s.halaqa,
      s.sheikh,
      s.date,
      s.phone,
      s.gender,
    ])

    const dateStr = new Date().toISOString().slice(0, 10)

    if (format === "xlsx") {
      const buffer = generateExcelBuffer("قائمة الطلاب", headers, rows)
      return {
        buffer,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename: `students_${dateStr}.xlsx`,
      }
    }

    if (format === "csv") {
      const buffer = generateCsvBuffer(headers, rows)
      return {
        buffer,
        contentType: "text/csv; charset=utf-8",
        filename: `students_${dateStr}.csv`,
      }
    }

    if (format === "pdf") {
      const buffer = await generatePdfBuffer("قائمة الطلاب - جمعية تحفيظ القرآن الكريم", headers, rows)
      return {
        buffer,
        contentType: "application/pdf",
        filename: `students_${dateStr}.pdf`,
      }
    }

    throw new AppError("صيغة التصدير غير مدعومة (xlsx, csv, pdf)", 400)
  }
}

export const studentsService = new StudentsService()
