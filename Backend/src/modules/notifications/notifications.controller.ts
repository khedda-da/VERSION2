import type { Request, Response, NextFunction } from "express"
import { notificationsService } from "./notifications.service.js"

export class NotificationsController {
  async getForUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "غير مصرح" })
        return
      }
      const data = await notificationsService.getForUser(req.user.id)
      res.json({ success: true, count: data.length, data })
    } catch (error) {
      next(error)
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "غير مصرح" })
        return
      }
      const count = await notificationsService.getUnreadCount(req.user.id)
      res.json({ success: true, count })
    } catch (error) {
      next(error)
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "غير مصرح" })
        return
      }
      const rawId = String(req.params.id).replace("notif-", "")
      await notificationsService.markAsRead(parseInt(rawId, 10), req.user.id)
      res.json({ success: true, message: "تم تحديد الإشعار كمقروء" })
    } catch (error) {
      next(error)
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "غير مصرح" })
        return
      }
      await notificationsService.markAllAsRead(req.user.id)
      res.json({ success: true, message: "تم تحديد جميع الإشعارات كمقروءة" })
    } catch (error) {
      next(error)
    }
  }

  async broadcast(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, body } = req.body
      const result = await notificationsService.broadcast(title, body, req.user)
      res.json({ message: "تم إرسال الإشعار لجميع المستخدمين", ...result })
    } catch (error) {
      next(error)
    }
  }
}

export const notificationsController = new NotificationsController()
