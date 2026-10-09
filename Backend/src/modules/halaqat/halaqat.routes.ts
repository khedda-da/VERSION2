import { Router } from "express"
import { halaqatController } from "./halaqat.controller.js"
import { authMiddleware, optionalAuthMiddleware } from "../../middleware/auth.middleware.js"
import { requireBranchOrCentral } from "../../middleware/rbac.middleware.js"

const router = Router()

router.get("/", optionalAuthMiddleware, (req, res, next) =>
  halaqatController.getAll(req, res, next),
)
router.get("/:id", optionalAuthMiddleware, (req, res, next) =>
  halaqatController.getById(req, res, next),
)
router.post("/", authMiddleware, requireBranchOrCentral, (req, res, next) =>
  halaqatController.create(req, res, next),
)
router.put("/:id", authMiddleware, requireBranchOrCentral, (req, res, next) =>
  halaqatController.update(req, res, next),
)
router.delete("/:id", authMiddleware, requireBranchOrCentral, (req, res, next) =>
  halaqatController.delete(req, res, next),
)

// Teacher assignment endpoints (F4)
router.post("/:id/teachers", authMiddleware, requireBranchOrCentral, (req, res, next) =>
  halaqatController.assignTeacher(req, res, next),
)
router.delete("/:id/teachers/:personId", authMiddleware, requireBranchOrCentral, (req, res, next) =>
  halaqatController.removeTeacher(req, res, next),
)

// Student enrollment endpoints (F5)
router.post("/:id/students", authMiddleware, (req, res, next) =>
  halaqatController.enrollStudent(req, res, next),
)
router.delete("/:id/students/:personId", authMiddleware, (req, res, next) =>
  halaqatController.unenrollStudent(req, res, next),
)

export default router
