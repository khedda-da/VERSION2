import { db } from "../../db/database.js"

export class AuditService {
  async getAll(limit = 50) {
    const rows = await db.query(
      `SELECT a.id, a.table_name, a.record_id, a.action, a.old_values, a.new_values, a.changed_at,
              u.username, p.full_name as user_full_name
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.changed_by
       LEFT JOIN persons p ON p.id = u.person_id
       ORDER BY a.id DESC
       LIMIT ?`,
      [limit],
    )

    return rows.map((r: any) => {
      let actionLabel = "تعديل"
      if (r.action === "CREATE") actionLabel = "إضافة"
      else if (r.action === "DELETE") actionLabel = "حذف"

      let tableLabel = r.table_name
      if (r.table_name === "students") tableLabel = "طالب"
      else if (r.table_name === "halaqat") tableLabel = "حلقة"
      else if (r.table_name === "branches") tableLabel = "مقر"
      else if (r.table_name === "users") tableLabel = "مستخدم"
      else if (r.table_name === "roles") tableLabel = "دور"

      return {
        id: Number(r.id),
        tableName: r.table_name,
        tableLabel,
        recordId: r.record_id ? Number(r.record_id) : null,
        action: r.action,
        actionLabel,
        user: r.user_full_name || r.username || "مدير النظام",
        oldValues: r.old_values ? JSON.parse(r.old_values) : null,
        newValues: r.new_values ? JSON.parse(r.new_values) : null,
        timestamp: r.changed_at ? String(r.changed_at).slice(0, 16) : "الآن",
      }
    })
  }
}

export const auditService = new AuditService()
