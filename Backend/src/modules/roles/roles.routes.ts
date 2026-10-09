import { Router } from "express"
import { rolesController } from "./roles.controller.js"
import { authMiddleware, optionalAuthMiddleware } from "../../middleware/auth.middleware.js"
import { requireCentral } from "../../middleware/rbac.middleware.js"

const router = Router()

router.get("/", optionalAuthMiddleware, (req, res, next) =>
  rolesController.getAll(req, res, next),
)
router.get("/:id", optionalAuthMiddleware, (req, res, next) =>
  rolesController.getById(req, res, next),
)
router.post("/", authMiddleware, requireCentral, (req, res, next) =>
  rolesController.create(req, res, next),
)
router.post("/assign", authMiddleware, requireCentral, (req, res, next) =>
  rolesController.assign(req, res, next),
)
router.post("/unassign", authMiddleware, requireCentral, (req, res, next) =>
  rolesController.unassign(req, res, next),
)

export default router
