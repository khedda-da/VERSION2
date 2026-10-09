import { db } from "../../db/database.js"
import { AppError } from "../../middleware/error.middleware.js"
import { logAudit } from "../../middleware/audit.middleware.js"
import type { AuthUser } from "../../types/express.js"
import { getUserScope } from "../../middleware/rbac.middleware.js"

export interface CreateSheikhDto {
  full_name: string
  phone?: string
  email?: string
  birth_date?: string
  gender?: "male" | "female"
  halaqa_ids?: number[]
}

export class SheikhsService {
  async getAll(user?: AuthUser, search?: string) {
    const scope = getUserScope(user)

    let sql = `
      SELECT DISTINCT p.id, p.full_name, p.phone, p.email, p.birth_date, p.gender, p.created_at
      FROM persons p
      LEFT JOIN halaqat_persons hp ON hp.person_id = p.id AND hp.role_in_halaqa = 'teacher'
      LEFT JOIN halaqat h ON h.id = hp.halaqa_id
      WHERE (p.person_type = 'sheikh' OR p.person_type = 'both' OR hp.id IS NOT NULL)
    `
    const params: any[] = []

    if (scope.type === "branch" && scope.branchId) {
      sql += ` AND h.branch_id = ?`
      params.push(scope.branchId)
    } else if (scope.type === "teacher" && scope.personId) {
      sql += ` AND p.id = ?`
      params.push(scope.personId)
    }

    if (search) {
      sql += ` AND (p.full_name LIKE ? OR p.phone LIKE ?)`
      params.push(`%${search.trim()}%`, `%${search.trim()}%`)
    }

    sql += ` ORDER BY p.id ASC`

    const sheikhs = await db.query(sql, params)

    // For each sheikh, get their halaqat, branches, and student count
    const result = []
    for (const s of sheikhs) {
      const pId = Number(s.id)

      const halaqat = await db.query(
        `SELECT h.id, h.name, b.name as branch_name,
                (SELECT COUNT(*) FROM halaqat_persons hp_s WHERE hp_s.halaqa_id = h.id AND hp_s.role_in_halaqa = 'student') as student_count
         FROM halaqat_persons hp
         JOIN halaqat h ON h.id = hp.halaqa_id
         JOIN branches b ON b.id = h.branch_id
         WHERE hp.person_id = ? AND hp.role_in_halaqa = 'teacher'`,
        [pId],
      )

      const halaqatNames = halaqat.map((h: any) => h.name)
      const branchNames = Array.from(new Set(halaqat.map((h: any) => h.branch_name)))
      const studentCount = halaqat.reduce((sum: number, h: any) => sum + Number(h.student_count), 0)

      result.push({
        id: String(pId),
        personId: pId,
        name: s.full_name,
        phone: s.phone || "",
        email: s.email || "",
        halaqat: halaqatNames,
        halaqaDetails: halaqat,
        branches: branchNames,
        studentCount,
        status: "نشط",
      })
    }

    return result
  }

  async getById(id: number, user?: AuthUser) {
    const person = await db.get(
      `SELECT * FROM persons WHERE id = ? AND (person_type = 'sheikh' OR person_type = 'both')`,
      [id],
    )

    if (!person) {
      throw new AppError("الشيخ غير موجود", 404)
    }

    // Halaqat taught
    const halaqat = await db.query(
      `SELECT h.id, h.name, h.level, b.name as branch_name,
              (SELECT COUNT(*) FROM halaqat_persons hp_s WHERE hp_s.halaqa_id = h.id AND hp_s.role_in_halaqa = 'student') as student_count
       FROM halaqat_persons hp
       JOIN halaqat h ON h.id = hp.halaqa_id
       JOIN branches b ON b.id = h.branch_id
       WHERE hp.person_id = ? AND hp.role_in_halaqa = 'teacher'`,
      [id],
    )

    // Students taught across all halaqat
    const students = await db.query(
      `SELECT DISTINCT p.id as person_id, p.full_name, p.phone, s.school_name, s.academic_level, h.name as halaqa_name, b.name as branch_name
       FROM halaqat_persons hp_t
       JOIN halaqat h ON h.id = hp_t.halaqa_id
       JOIN branches b ON b.id = h.branch_id
       JOIN halaqat_persons hp_s ON hp_s.halaqa_id = h.id AND hp_s.role_in_halaqa = 'student'
       JOIN persons p ON p.id = hp_s.person_id
       JOIN students s ON s.person_id = p.id
       WHERE hp_t.person_id = ? AND hp_t.role_in_halaqa = 'teacher'
       ORDER BY p.full_name ASC`,
      [id],
    )

    const halaqatNames = halaqat.map((h: any) => h.name)
    const branchNames = Array.from(new Set(halaqat.map((h: any) => h.branch_name)))

    return {
      id: String(person.id),
      personId: Number(person.id),
      name: person.full_name,
      phone: person.phone || "",
      email: person.email || "",
      birthDate: person.birth_date,
      gender: person.gender,
      halaqat: halaqatNames,
      halaqaDetails: halaqat,
      branches: branchNames,
      studentCount: students.length,
      students,
      status: "نشط",
    }
  }

  async create(dto: CreateSheikhDto, currentUserId?: number) {
    if (!dto.full_name || !dto.full_name.trim()) {
      throw new AppError("الاسم الكامل للشيخ مطلوب", 400)
    }

    if (!dto.phone && !dto.email) {
      throw new AppError("يجب توفير رقم الهاتف أو البريد الإلكتروني", 400)
    }

    const res = await db.run(
      `INSERT INTO persons (full_name, phone, email, birth_date, gender, person_type)
       VALUES (?, ?, ?, ?, ?, 'sheikh')`,
      [
        dto.full_name.trim(),
        dto.phone?.trim() || null,
        dto.email?.trim() || null,
        dto.birth_date || null,
        dto.gender || "male",
      ],
    )

    const personId = res.lastInsertRowid

    if (dto.halaqa_ids && dto.halaqa_ids.length > 0) {
      for (const hId of dto.halaqa_ids) {
        await db.run(
          `INSERT INTO halaqat_persons (halaqa_id, person_id, role_in_halaqa) VALUES (?, ?, 'teacher')`,
          [hId, personId],
        )
      }
    }

    await logAudit("persons", personId, "CREATE", currentUserId, null, {
      ...dto,
      person_type: "sheikh",
    })

    return this.getById(personId)
  }
}

export const sheikhsService = new SheikhsService()
