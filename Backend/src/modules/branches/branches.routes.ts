import { Router } from "express"
import { branchesController } from "./branches.controller.js"
import { authMiddleware, optionalAuthMiddleware } from "../../middleware/auth.middleware.js"
import { requireCentral, requireBranchOrCentral } from "../../middleware/rbac.middleware.js"

const router = Router()

router.get("/", optionalAuthMiddleware, (req, res, next) =>
  branchesController.getAll(req, res, next),
)
router.get("/:id", optionalAuthMiddleware, (req, res, next) =>
  branchesController.getById(req, res, next),
)
router.post("/", authMiddleware, requireCentral, (req, res, next) =>
  branchesController.create(req, res, next),
)
router.put("/:id", authMiddleware, requireBranchOrCentral, (req, res, next) =>
  branchesController.update(req, res, next),
)
router.delete("/:id", authMiddleware, requireCentral, (req, res, next) =>
  branchesController.delete(req, res, next),
)

// Branch admin assignment endpoints (F8)
router.post("/:id/admins", authMiddleware, requireCentral, (req, res, next) =>
  branchesController.addAdmin(req, res, next),
)
router.delete("/:id/admins/:personId", authMiddleware, requireCentral, (req, res, next) =>
  branchesController.removeAdmin(req, res, next),
)

export default router
