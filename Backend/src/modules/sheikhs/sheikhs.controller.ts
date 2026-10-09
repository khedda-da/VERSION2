import type { Request, Response, NextFunction } from "express"
import { sheikhsService } from "./sheikhs.service.js"

export class SheikhsController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search } = req.query
      const data = await sheikhsService.getAll(req.user, search as string)
      res.json({ success: true, count: data.length, data })
    } catch (error) {
      next(error)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10)
      const data = await sheikhsService.getById(id, req.user)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await sheikhsService.create(req.body, req.user?.id)
      res.status(201).json({
        success: true,
        message: "تمت إضافة الشيخ بنجاح",
        data,
      })
    } catch (error) {
      next(error)
    }
  }
}

export const sheikhsController = new SheikhsController()
