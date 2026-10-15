import { Router } from "express"
import { authController } from "./auth.controller.js"
import { authMiddleware } from "../../middleware/auth.middleware.js"
import { rateLimit } from "../../middleware/rateLimit.middleware.js"
import { config } from "../../config/env.js"

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: config.registerRateLimitMax,
  message: "تم تجاوز عدد محاولات التسجيل. حاول مرة أخرى لاحقًا.",
})

const router = Router()

router.get("/setup-status", (req, res, next) => authController.setupStatus(req, res, next))
router.post("/setup", (req, res, next) => authController.setup(req, res, next))
router.post("/register", registerLimiter, (req, res, next) => authController.register(req, res, next))
router.post("/login", (req, res, next) => authController.login(req, res, next))
router.get("/me", authMiddleware, (req, res, next) => authController.me(req, res, next))
router.post("/logout", authMiddleware, (req, res) => authController.logout(req, res))

export default router
