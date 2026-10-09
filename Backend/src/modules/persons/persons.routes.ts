import { Router } from "express"
import { personsController } from "./persons.controller.js"
import { authMiddleware, optionalAuthMiddleware } from "../../middleware/auth.middleware.js"
import { requireBranchOrCentral } from "../../middleware/rbac.middleware.js"

const router = Router()

router.get("/", optionalAuthMiddleware, (req, res, next) =>
  personsController.getAll(req, res, next),
)
router.get("/:id", optionalAuthMiddleware, (req, res, next) =>
  personsController.getById(req, res, next),
)
router.post("/", authMiddleware, requireBranchOrCentral, (req, res, next) =>
  personsController.create(req, res, next),
)
router.put("/:id", authMiddleware, requireBranchOrCentral, (req, res, next) =>
  personsController.update(req, res, next),
)
router.delete("/:id", authMiddleware, requireBranchOrCentral, (req, res, next) =>
  personsController.delete(req, res, next),
)

export default router
