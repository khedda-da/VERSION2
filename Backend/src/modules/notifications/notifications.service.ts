import { db } from "../../db/database.js"
import { AppError } from "../../middleware/error.middleware.js"
import type { AuthUser } from "../../types/express.js"

export class NotificationsService {
  async getForUser(userId: number) {
    const rows = await db.query(
      `SELECT id, user_id, title, body, type, is_read, related_entity_type, related_entity_id, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY id DESC`,
      [userId],
    )

    return rows.map((n: any) => {
      let targetScreen = "dashboard"
      if (n.related_entity_type === "student") targetScreen = "student"
      else if (n.related_entity_type === "halaqa") targetScreen = "halaqat"
      else if (n.related_entity_type === "branch") targetScreen = "branches"
      else if (n.related_entity_type === "role") targetScreen = "roles"

      return {
        id: `notif-${n.id}`,
        notificationId: Number(n.id),
        title: n.title,
        description: n.body,
        body: n.body,
        type: n.type,
        timeAgo: n.created_at ? String(n.created_at).slice(0, 16) : "الآن",
        targetScreen,
        read: Boolean(n.is_read),
        isRead: Boolean(n.is_read),
        createdAt: n.created_at,
      }
    })
  }

  async getUnreadCount(userId: number): Promise<number> {
    const row = await db.get(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [userId],
    )
    return Number(row?.count ?? 0)
  }

  async markAsRead(notificationId: number, userId: number) {
    await db.run(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [notificationId, userId],
    )
    return { success: true }
  }

  async markAllAsRead(userId: number) {
    await db.run(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ?`,
      [userId],
    )
    return { success: true }
  }

  // N1: Broadcast notification to all active users
  async broadcast(title: string, body: string, senderUser?: AuthUser) {
    const users = await db.query(`SELECT id FROM users WHERE is_active = 1`)
    for (const u of users) {
      await db.run(
        `INSERT INTO notifications (user_id, title, body, type, is_read, related_entity_type)
         VALUES (?, ?, ?, 'broadcast', 0, 'announcement')`,
        [u.id, title, body],
      )
    }
    return { success: true, count: users.length }
  }
}

export const notificationsService = new NotificationsService()
