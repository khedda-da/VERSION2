import { db } from "../../db/database.js"
import { AppError } from "../../middleware/error.middleware.js"
import type { AuthUser } from "../../types/express.js"
import { getUserScope } from "../../middleware/rbac.middleware.js"
import { ACADEMIC_LEVELS_ARABIC } from "../../config/constants.js"
import {
  generateExcelBuffer,
  generateCsvBuffer,
  generatePdfBuffer,
} from "../../utils/export.utils.js"

export class ReportsService {
  async getStudentsByBranch(user?: AuthUser) {
    const scope = getUserScope(user)
    const rows = await db.query(
      `SELECT b.id, b.name as branch_name, b.location,
              COUNT(s.id) as student_count,
              COUNT(DISTINCT h.id) as halaqa_count
       FROM branches b
       LEFT JOIN students s ON s.branch_id = b.id
       LEFT JOIN halaqat h ON h.branch_id = b.id
       ${scope.type === "branch" && scope.branchId ? "WHERE b.id = ?" : ""}
       GROUP BY b.id, b.name, b.location
       ORDER BY student_count DESC`,
      scope.type === "branch" && scope.branchId ? [scope.branchId] : [],
    )

    return rows.map((r: any) => ({
      branchId: Number(r.id),
      branchName: r.branch_name,
      location: r.location || "",
      studentCount: Number(r.student_count),
      halaqaCount: Number(r.halaqa_count),
    }))
  }

  async getStudentsByLevel(user?: AuthUser) {
    const scope = getUserScope(user)
    const rows = await db.query(
      `SELECT s.academic_level, COUNT(s.id) as student_count
       FROM students s
       ${scope.type === "branch" && scope.branchId ? "WHERE s.branch_id = ?" : ""}
       GROUP BY s.academic_level
       ORDER BY student_count DESC`,
      scope.type === "branch" && scope.branchId ? [scope.branchId] : [],
    )

    return rows.map((r: any) => ({
      level:
        ACADEMIC_LEVELS_ARABIC[r.academic_level as keyof typeof ACADEMIC_LEVELS_ARABIC] ||
        r.academic_level,
      rawLevel: r.academic_level,
      studentCount: Number(r.student_count),
    }))
  }

  async getStudentsByHalaqa(user?: AuthUser) {
    const scope = getUserScope(user)

    let sql = `
      SELECT h.id, h.name as halaqa_name, h.level, b.name as branch_name,
             COUNT(hp_s.person_id) as student_count,
             (SELECT p.full_name FROM halaqat_persons hp_t JOIN persons p ON p.id = hp_t.person_id WHERE hp_t.halaqa_id = h.id AND hp_t.role_in_halaqa = 'teacher' LIMIT 1) as teacher_name
      FROM halaqat h
      JOIN branches b ON b.id = h.branch_id
      LEFT JOIN halaqat_persons hp_s ON hp_s.halaqa_id = h.id AND hp_s.role_in_halaqa = 'student'
      WHERE 1=1
    `
    const params: any[] = []

    if (scope.type === "branch" && scope.branchId) {
      sql += ` AND h.branch_id = ?`
      params.push(scope.branchId)
    } else if (scope.type === "teacher" && scope.halaqaIds) {
      if (scope.halaqaIds.length === 0) return []
      sql += ` AND h.id IN (${scope.halaqaIds.map(() => "?").join(",")})`
      params.push(...scope.halaqaIds)
    }

    sql += ` GROUP BY h.id, h.name, h.level, b.name ORDER BY student_count DESC`

    const rows = await db.query(sql, params)
    return rows.map((r: any) => ({
      halaqaId: Number(r.id),
      halaqaName: r.halaqa_name,
      level: r.level,
      branchName: r.branch_name,
      sheikh: r.teacher_name || "غير محدد",
      studentCount: Number(r.student_count),
    }))
  }

  async getStudentsBySheikh(user?: AuthUser) {
    const scope = getUserScope(user)

    let sql = `
      SELECT p.id as person_id, p.full_name as sheikh_name, p.phone,
             COUNT(DISTINCT hp_s.person_id) as student_count,
             COUNT(DISTINCT h.id) as halaqa_count
      FROM persons p
      JOIN halaqat_persons hp_t ON hp_t.person_id = p.id AND hp_t.role_in_halaqa = 'teacher'
      JOIN halaqat h ON h.id = hp_t.halaqa_id
      LEFT JOIN halaqat_persons hp_s ON hp_s.halaqa_id = h.id AND hp_s.role_in_halaqa = 'student'
      WHERE 1=1
    `
    const params: any[] = []

    if (scope.type === "branch" && scope.branchId) {
      sql += ` AND h.branch_id = ?`
      params.push(scope.branchId)
    } else if (scope.type === "teacher" && scope.personId) {
      sql += ` AND p.id = ?`
      params.push(scope.personId)
    }

    sql += ` GROUP BY p.id, p.full_name, p.phone ORDER BY student_count DESC`

    const rows = await db.query(sql, params)
    return rows.map((r: any) => ({
      sheikhId: Number(r.person_id),
      sheikhName: r.sheikh_name,
      phone: r.phone || "",
      studentCount: Number(r.student_count),
      halaqaCount: Number(r.halaqa_count),
    }))
  }

  async getEnrollmentTrends(user?: AuthUser) {
    const scope = getUserScope(user)
    const rows = await db.query(
      `SELECT enrollment_date, COUNT(*) as count
       FROM students
       ${scope.type === "branch" && scope.branchId ? "WHERE branch_id = ?" : ""}
       GROUP BY enrollment_date
       ORDER BY enrollment_date ASC`,
      scope.type === "branch" && scope.branchId ? [scope.branchId] : [],
    )

    return rows.map((r: any) => ({
      date: r.enrollment_date,
      count: Number(r.count),
    }))
  }

  async exportReport(
    reportType: string,
    format: "xlsx" | "csv" | "pdf",
    user?: AuthUser,
  ) {
    let headers: string[] = []
    let rows: any[][] = []
    let title = "تقرير إداري"

    if (reportType === "branch") {
      title = "تقرير الطلاب حسب المقر"
      const data = await this.getStudentsByBranch(user)
      headers = ["المقر", "الموقع", "عدد الطلاب", "عدد الحلقات"]
      rows = data.map((d) => [d.branchName, d.location, d.studentCount, d.halaqaCount])
    } else if (reportType === "level") {
      title = "تقرير الطلاب حسب المستوى الدراسي"
      const data = await this.getStudentsByLevel(user)
      headers = ["المستوى الدراسي", "عدد الطلاب"]
      rows = data.map((d) => [d.level, d.studentCount])
    } else if (reportType === "halaqa") {
      title = "تقرير الطلاب حسب الحلقة"
      const data = await this.getStudentsByHalaqa(user)
      headers = ["الحلقة", "المستوى", "المقر", "الشيخ", "عدد الطلاب"]
      rows = data.map((d) => [d.halaqaName, d.level, d.branchName, d.sheikh, d.studentCount])
    } else if (reportType === "sheikh") {
      title = "تقرير الطلاب حسب الشيخ"
      const data = await this.getStudentsBySheikh(user)
      headers = ["الشيخ", "الهاتف", "عدد الطلاب", "عدد الحلقات"]
      rows = data.map((d) => [d.sheikhName, d.phone, d.studentCount, d.halaqaCount])
    } else {
      title = "تقرير إحصائيات التسجيل"
      const data = await this.getEnrollmentTrends(user)
      headers = ["تاريخ التسجيل", "عدد المسجلين"]
      rows = data.map((d) => [d.date, d.count])
    }

    const dateStr = new Date().toISOString().slice(0, 10)

    if (format === "xlsx") {
      const buffer = generateExcelBuffer(title, headers, rows)
      return {
        buffer,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename: `${reportType}_report_${dateStr}.xlsx`,
      }
    }

    if (format === "csv") {
      const buffer = generateCsvBuffer(headers, rows)
      return {
        buffer,
        contentType: "text/csv; charset=utf-8",
        filename: `${reportType}_report_${dateStr}.csv`,
      }
    }

    if (format === "pdf") {
      const buffer = await generatePdfBuffer(title, headers, rows)
      return {
        buffer,
        contentType: "application/pdf",
        filename: `${reportType}_report_${dateStr}.pdf`,
      }
    }

    throw new AppError("صيغة التصدير غير مدعومة", 400)
  }
}

export const reportsService = new ReportsService()
