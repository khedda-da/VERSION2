import { Router } from "express"
import { auditController } from "./audit.controller.js"
import { authMiddleware } from "../../middleware/auth.middleware.js"
import { requireCentral } from "../../middleware/rbac.middleware.js"

const router = Router()

router.get("/", authMiddleware, requireCentral, (req, res, next) =>
  auditController.getAll(req, res, next),
)

export default router
