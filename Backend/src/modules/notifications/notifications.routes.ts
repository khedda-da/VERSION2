import { Router } from "express"
import { notificationsController } from "./notifications.controller.js"
import { authMiddleware } from "../../middleware/auth.middleware.js"
import { requireCentral } from "../../middleware/rbac.middleware.js"

const router = Router()

router.get("/", authMiddleware, (req, res, next) =>
  notificationsController.getForUser(req, res, next),
)
router.get("/unread-count", authMiddleware, (req, res, next) =>
  notificationsController.getUnreadCount(req, res, next),
)
router.put("/read-all", authMiddleware, (req, res, next) =>
  notificationsController.markAllAsRead(req, res, next),
)
router.put("/:id/read", authMiddleware, (req, res, next) =>
  notificationsController.markAsRead(req, res, next),
)
router.post("/broadcast", authMiddleware, requireCentral, (req, res, next) =>
  notificationsController.broadcast(req, res, next),
)

export default router
