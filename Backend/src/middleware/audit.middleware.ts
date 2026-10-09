import { db } from "../db/database.js"

export async function logAudit(
  tableName: string,
  recordId: number | null,
  action: "CREATE" | "UPDATE" | "DELETE",
  changedBy?: number | null,
  oldValues?: any,
  newValues?: any,
): Promise<void> {
  try {
    const oldStr = oldValues ? JSON.stringify(oldValues) : null
    const newStr = newValues ? JSON.stringify(newValues) : null

    await db.run(
      `INSERT INTO audit_logs (table_name, record_id, action, changed_by, old_values, new_values)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tableName, recordId, action, changedBy ?? null, oldStr, newStr],
    )
  } catch (err) {
    console.error("[AuditLog Error]", err)
  }
}
