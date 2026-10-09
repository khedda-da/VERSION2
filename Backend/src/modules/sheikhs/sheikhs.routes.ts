import { Router } from "express"
import { sheikhsController } from "./sheikhs.controller.js"
import { authMiddleware, optionalAuthMiddleware } from "../../middleware/auth.middleware.js"
import { requireBranchOrCentral } from "../../middleware/rbac.middleware.js"

const router = Router()

router.get("/", optionalAuthMiddleware, (req, res, next) =>
  sheikhsController.getAll(req, res, next),
)
router.get("/:id", optionalAuthMiddleware, (req, res, next) =>
  sheikhsController.getById(req, res, next),
)
router.post("/", authMiddleware, requireBranchOrCentral, (req, res, next) =>
  sheikhsController.create(req, res, next),
)

export default router
