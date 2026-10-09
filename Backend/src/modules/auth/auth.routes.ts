import { Router } from "express"
import { authController } from "./auth.controller.js"
import { authMiddleware } from "../../middleware/auth.middleware.js"

const router = Router()

router.post("/login", (req, res, next) => authController.login(req, res, next))
router.get("/me", authMiddleware, (req, res, next) => authController.me(req, res, next))
router.post("/logout", authMiddleware, (req, res) => authController.logout(req, res))

export default router
