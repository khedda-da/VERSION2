import type { Request, Response, NextFunction } from "express"
import { usersService } from "./users.service.js"

export class UsersController {
  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await usersService.getAll()
      res.json({ success: true, count: data.length, data })
    } catch (error) {
      next(error)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10)
      const data = await usersService.getById(id)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await usersService.create(req.body, req.user, req)
      res.status(201).json({
        success: true,
        message: "تم إنشاء حساب المستخدم بنجاح",
        data,
      })
    } catch (error) {
      next(error)
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10)
      const data = await usersService.update(id, req.body, req.user)
      res.json({
        success: true,
        message: "تم تحديث بيانات المستخدم بنجاح",
        data,
      })
    } catch (error) {
      next(error)
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10)
      await usersService.delete(id, req.user)
      res.json({
        success: true,
        message: "تم حذف المستخدم بنجاح",
      })
    } catch (error) {
      next(error)
    }
  }
}

export const usersController = new UsersController()
