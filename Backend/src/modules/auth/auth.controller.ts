import type { Request, Response, NextFunction } from "express"
import { authService } from "./auth.service.js"

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password } = req.body
      const result = await authService.login(username, password)
      res.json({
        success: true,
        message: "تم تسجيل الدخول بنجاح",
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async setupStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: { needsSetup: await authService.needsSetup() } })
    } catch (error) {
      next(error)
    }
  }

  async setup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.setupFirstUser(req.body ?? {})
      res.status(201).json({
        success: true,
        message: "تم إنشاء حساب المدير بنجاح",
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "غير مصرح" })
        return
      }
      res.json({
        success: true,
        data: req.user,
      })
    } catch (error) {
      next(error)
    }
  }

  async logout(_req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      message: "تم تسجيل الخروج بنجاح",
    })
  }
}

export const authController = new AuthController()
