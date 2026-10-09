import { Router } from "express"
import { studentsController } from "./students.controller.js"
import { authMiddleware, optionalAuthMiddleware } from "../../middleware/auth.middleware.js"

const router = Router()

// F11: Export search results (Excel, CSV, PDF)
router.get("/export", optionalAuthMiddleware, (req, res, next) =>
  studentsController.exportList(req, res, next),
)

// F10: Advanced multi-criteria search
router.get("/", optionalAuthMiddleware, (req, res, next) =>
  studentsController.search(req, res, next),
)

router.get("/:id", optionalAuthMiddleware, (req, res, next) =>
  studentsController.getById(req, res, next),
)

// F9: Add student (Central admin, Branch admin for their branch, Sheikh for their halaqa)
router.post("/", authMiddleware, (req, res, next) =>
  studentsController.create(req, res, next),
)

router.put("/:id", authMiddleware, (req, res, next) =>
  studentsController.update(req, res, next),
)

router.delete("/:id", authMiddleware, (req, res, next) =>
  studentsController.delete(req, res, next),
)

export default router
