import { db } from "../../db/database.js"
import { AppError } from "../../middleware/error.middleware.js"
import { logAudit } from "../../middleware/audit.middleware.js"
import { calculateAge, normalizeArabic } from "../../utils/arabic.utils.js"

export interface CreatePersonDto {
  full_name: string
  phone?: string
  email?: string
  birth_date?: string
  gender?: "male" | "female"
  person_type: "student" | "sheikh" | "both"
}

export interface UpdatePersonDto {
  full_name?: string
  phone?: string
  email?: string
  birth_date?: string
  gender?: "male" | "female"
  person_type?: "student" | "sheikh" | "both"
}

export class PersonsService {
  async getAll(filters?: {
    person_type?: string
    search?: string
    gender?: string
  }) {
    let sql = `
      SELECT p.id, p.full_name, p.phone, p.email, p.birth_date, p.gender, p.person_type, p.created_at,
             (SELECT COUNT(*) FROM halaqat_persons hp WHERE hp.person_id = p.id AND hp.role_in_halaqa = 'teacher') as taught_halaqat_count,
             (SELECT COUNT(*) FROM halaqat_persons hp WHERE hp.person_id = p.id AND hp.role_in_halaqa = 'student') as enrolled_halaqat_count,
             (SELECT COUNT(*) FROM person_roles pr WHERE pr.person_id = p.id) as roles_count
      FROM persons p
      WHERE 1=1
    `
    const params: any[] = []

    if (filters?.person_type) {
      sql += ` AND (p.person_type = ? OR p.person_type = 'both')`
      params.push(filters.person_type)
    }

    if (filters?.gender) {
      const g = filters.gender === "ذكر" ? "male" : filters.gender === "أنثى" ? "female" : filters.gender
      sql += ` AND p.gender = ?`
      params.push(g)
    }

    if (filters?.search) {
      const term = `%${filters.search.trim()}%`
      sql += ` AND (p.full_name LIKE ? OR p.phone LIKE ? OR p.email LIKE ?)`
      params.push(term, term, term)
    }

    sql += ` ORDER BY p.id DESC`

    const rows = await db.query(sql, params)
    return rows.map((r) => ({
      ...r,
      age: calculateAge(r.birth_date),
      gender_ar: r.gender === "male" ? "ذكر" : r.gender === "female" ? "أنثى" : "",
    }))
  }

  async getById(id: number) {
    const person = await db.get(
      `SELECT * FROM persons WHERE id = ?`,
      [id],
    )

    if (!person) {
      throw new AppError("الشخص غير موجود", 404)
    }

    // Get student record if exists
    const student = await db.get(
      `SELECT s.*, b.name as branch_name 
       FROM students s 
       JOIN branches b ON b.id = s.branch_id 
       WHERE s.person_id = ?`,
      [id],
    )

    // Get roles
    const roles = await db.query(
      `SELECT r.id, r.name, r.scope, b.name as branch_name 
       FROM person_roles pr 
       JOIN roles r ON r.id = pr.role_id 
       LEFT JOIN branches b ON b.id = pr.branch_id 
       WHERE pr.person_id = ?`,
      [id],
    )

    // Get halaqat
    const halaqat = await db.query(
      `SELECT h.id, h.name, h.level, b.name as branch_name, hp.role_in_halaqa 
       FROM halaqat_persons hp 
       JOIN halaqat h ON h.id = hp.halaqa_id 
       JOIN branches b ON b.id = h.branch_id 
       WHERE hp.person_id = ?`,
      [id],
    )

    // Get user account if exists
    const user = await db.get(
      `SELECT id, username, last_login, is_active FROM users WHERE person_id = ?`,
      [id],
    )

    return {
      ...person,
      age: calculateAge(person.birth_date),
      gender_ar: person.gender === "male" ? "ذكر" : person.gender === "female" ? "أنثى" : "",
      student: student || null,
      roles,
      halaqat,
      user: user || null,
    }
  }

  async create(dto: CreatePersonDto, currentUserId?: number) {
    if (!dto.full_name || !dto.full_name.trim()) {
      throw new AppError("الاسم الكامل مطلوب", 400)
    }

    if (!dto.phone && !dto.email) {
      throw new AppError("يجب توفير رقم الهاتف أو البريد الإلكتروني على الأقل", 400)
    }

    if (!dto.person_type || !["student", "sheikh", "both"].includes(dto.person_type)) {
      throw new AppError("نوع الشخص غير صالح (student, sheikh, both)", 400)
    }

    const res = await db.run(
      `INSERT INTO persons (full_name, phone, email, birth_date, gender, person_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        dto.full_name.trim(),
        dto.phone?.trim() || null,
        dto.email?.trim() || null,
        dto.birth_date || null,
        dto.gender || null,
        dto.person_type,
      ],
    )

    const personId = res.lastInsertRowid
    await logAudit("persons", personId, "CREATE", currentUserId, null, dto)

    return this.getById(personId)
  }

  async update(id: number, dto: UpdatePersonDto, currentUserId?: number) {
    const existing = await db.get(`SELECT * FROM persons WHERE id = ?`, [id])
    if (!existing) {
      throw new AppError("الشخص غير موجود", 404)
    }

    const full_name = dto.full_name !== undefined ? dto.full_name.trim() : existing.full_name
    const phone = dto.phone !== undefined ? dto.phone.trim() || null : existing.phone
    const email = dto.email !== undefined ? dto.email.trim() || null : existing.email
    const birth_date = dto.birth_date !== undefined ? dto.birth_date : existing.birth_date
    const gender = dto.gender !== undefined ? dto.gender : existing.gender
    const person_type = dto.person_type !== undefined ? dto.person_type : existing.person_type

    if (!phone && !email) {
      throw new AppError("يجب توفير رقم الهاتف أو البريد الإلكتروني على الأقل", 400)
    }

    await db.run(
      `UPDATE persons
       SET full_name = ?, phone = ?, email = ?, birth_date = ?, gender = ?, person_type = ?,
           updated_at = ${db.isPostgres() ? "NOW()" : "datetime('now')"}
       WHERE id = ?`,
      [full_name, phone, email, birth_date, gender, person_type, id],
    )

    await logAudit("persons", id, "UPDATE", currentUserId, existing, dto)
    return this.getById(id)
  }

  async delete(id: number, currentUserId?: number) {
    const existing = await db.get(`SELECT * FROM persons WHERE id = ?`, [id])
    if (!existing) {
      throw new AppError("الشخص غير موجود", 404)
    }

    await db.run(`DELETE FROM persons WHERE id = ?`, [id])
    await logAudit("persons", id, "DELETE", currentUserId, existing, null)
    return { success: true }
  }
}

export const personsService = new PersonsService()
