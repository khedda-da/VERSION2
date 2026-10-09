import { Router } from "express"
import { dashboardController } from "./dashboard.controller.js"
import { optionalAuthMiddleware } from "../../middleware/auth.middleware.js"

const router = Router()

router.get("/stats", optionalAuthMiddleware, (req, res, next) =>
  dashboardController.getStats(req, res, next),
)

export default router
