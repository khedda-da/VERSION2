import { db } from "../../db/database.js"
import type { AuthUser } from "../../types/express.js"
import { getUserScope } from "../../middleware/rbac.middleware.js"
import { ACADEMIC_LEVELS_ARABIC } from "../../config/constants.js"

export class DashboardService {
  async getStats(user?: AuthUser) {
    const scope = getUserScope(user)

    let branchCondition = ""
    const params: any[] = []

    if (scope.type === "branch" && scope.branchId) {
      branchCondition = " WHERE branch_id = ?"
      params.push(scope.branchId)
    }

    // 1. Total Students
    const studentCountRow = await db.get(
      `SELECT COUNT(*) as count FROM students ${branchCondition}`,
      params,
    )
    const totalStudents = Number(studentCountRow?.count ?? 0)

    // 2. Total Sheikhs
    let sheikhCount = 0
    if (scope.type === "branch" && scope.branchId) {
      const sheikhRow = await db.get(
        `SELECT COUNT(DISTINCT hp.person_id) as count
         FROM halaqat_persons hp
         JOIN halaqat h ON h.id = hp.halaqa_id
         WHERE hp.role_in_halaqa = 'teacher' AND h.branch_id = ?`,
        [scope.branchId],
      )
      sheikhCount = Number(sheikhRow?.count ?? 0)
    } else {
      const sheikhRow = await db.get(
        `SELECT COUNT(*) as count FROM persons WHERE person_type IN ('sheikh', 'both')`,
      )
      sheikhCount = Number(sheikhRow?.count ?? 0)
    }

    // 3. Total Halaqat
    const halaqaRow = await db.get(
      `SELECT COUNT(*) as total, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
       FROM halaqat ${branchCondition}`,
      params,
    )
    const totalHalaqat = Number(halaqaRow?.total ?? 0)
    const activeHalaqat = Number(halaqaRow?.active ?? 0)

    // 4. Total Branches
    const branchRow = await db.get(
      `SELECT COUNT(*) as total, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
       FROM branches ${scope.type === "branch" && scope.branchId ? "WHERE id = ?" : ""}`,
      scope.type === "branch" && scope.branchId ? [scope.branchId] : [],
    )
    const totalBranches = Number(branchRow?.total ?? 0)
    const activeBranches = Number(branchRow?.active ?? 0)

    // 5. Distribution of students per branch
    const branchDistRows = await db.query(
      `SELECT b.id, b.name, COUNT(s.id) as student_count
       FROM branches b
       LEFT JOIN students s ON s.branch_id = b.id
       ${scope.type === "branch" && scope.branchId ? "WHERE b.id = ?" : ""}
       GROUP BY b.id, b.name
       ORDER BY student_count DESC`,
      scope.type === "branch" && scope.branchId ? [scope.branchId] : [],
    )

    const maxStudents = Math.max(
      ...branchDistRows.map((r: any) => Number(r.student_count)),
      1,
    )
    const studentsByBranch = branchDistRows.map((r: any) => {
      const count = Number(r.student_count)
      const width = Math.round((count / maxStudents) * 100)
      return {
        name: r.name,
        val: String(count),
        count,
        width,
      }
    })

    // 6. Distribution of students per academic level
    const levelDistRows = await db.query(
      `SELECT s.academic_level, COUNT(*) as count
       FROM students s
       ${branchCondition}
       GROUP BY s.academic_level`,
      params,
    )

    const studentsByLevel: Record<string, number> = {
      ابتدائي: 0,
      متوسط: 0,
      ثانوي: 0,
      جامعي: 0,
    }

    levelDistRows.forEach((r: any) => {
      const arLabel =
        ACADEMIC_LEVELS_ARABIC[r.academic_level as keyof typeof ACADEMIC_LEVELS_ARABIC] ||
        r.academic_level
      studentsByLevel[arLabel] = Number(r.count)
    })

    // 7. Recent activity (from audit_logs or recent additions)
    const recentStudents = await db.query(
      `SELECT p.full_name, b.name as branch_name, s.created_at
       FROM students s
       JOIN persons p ON p.id = s.person_id
       JOIN branches b ON b.id = s.branch_id
       ${scope.type === "branch" && scope.branchId ? "WHERE s.branch_id = ?" : ""}
       ORDER BY s.id DESC
       LIMIT 5`,
      scope.type === "branch" && scope.branchId ? [scope.branchId] : [],
    )

    return {
      metrics: {
        totalStudents,
        totalSheikhs: sheikhCount,
        totalHalaqat,
        activeHalaqat,
        totalBranches,
        activeBranches,
        thisMonthStudents: totalStudents, // can calculate monthly
      },
      cards: [
        {
          label: "إجمالي الطلاب",
          value: totalStudents.toLocaleString("ar-DZ"),
          detail: "+32 هذا الشهر",
          icon: "school",
        },
        {
          label: "الشيوخ",
          value: sheikhCount.toLocaleString("ar-DZ"),
          detail: `${sheikhCount} نشطون حاليا`,
          icon: "user",
        },
        {
          label: "الحلقات",
          value: totalHalaqat.toLocaleString("ar-DZ"),
          detail: `${activeHalaqat} حلقة نشطة`,
          icon: "book",
        },
        {
          label: "المقرات",
          value: totalBranches.toLocaleString("ar-DZ"),
          detail: "جميعها نشطة",
          icon: "branch",
        },
      ],
      studentsByBranch,
      studentsByLevel,
      recentActivity: recentStudents.map((s: any) => [
        "إدارة التسجيل",
        "أضاف الطالب",
        s.full_name,
        s.branch_name,
        s.created_at ? String(s.created_at).slice(0, 16) : "اليوم",
      ]),
    }
  }
}

export const dashboardService = new DashboardService()
