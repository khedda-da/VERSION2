import { Router } from "express"
import { usersController } from "./users.controller.js"
import { authMiddleware } from "../../middleware/auth.middleware.js"
import { requireCentral, requireAdmin } from "../../middleware/rbac.middleware.js"

const router = Router()

router.get("/", authMiddleware, requireCentral, (req, res, next) =>
  usersController.getAll(req, res, next),
)
router.get("/:id", authMiddleware, requireCentral, (req, res, next) =>
  usersController.getById(req, res, next),
)
router.post("/", authMiddleware, requireAdmin, (req, res, next) =>
  usersController.create(req, res, next),
)
router.put("/:id", authMiddleware, requireCentral, (req, res, next) =>
  usersController.update(req, res, next),
)
router.delete("/:id", authMiddleware, requireCentral, (req, res, next) =>
  usersController.delete(req, res, next),
)

export default router
