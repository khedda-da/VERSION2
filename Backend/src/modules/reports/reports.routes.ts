import { Router } from "express"
import { reportsController } from "./reports.controller.js"
import { optionalAuthMiddleware } from "../../middleware/auth.middleware.js"

const router = Router()

router.get("/students-by-branch", optionalAuthMiddleware, (req, res, next) =>
  reportsController.getByBranch(req, res, next),
)
router.get("/students-by-level", optionalAuthMiddleware, (req, res, next) =>
  reportsController.getByLevel(req, res, next),
)
router.get("/students-by-halaqa", optionalAuthMiddleware, (req, res, next) =>
  reportsController.getByHalaqa(req, res, next),
)
router.get("/students-by-sheikh", optionalAuthMiddleware, (req, res, next) =>
  reportsController.getBySheikh(req, res, next),
)
router.get("/enrollment-trends", optionalAuthMiddleware, (req, res, next) =>
  reportsController.getTrends(req, res, next),
)
router.get("/export", optionalAuthMiddleware, (req, res, next) =>
  reportsController.exportReport(req, res, next),
)

export default router
