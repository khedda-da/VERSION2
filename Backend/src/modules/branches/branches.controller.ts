import type { Request, Response, NextFunction } from "express"
import { branchesService } from "./branches.service.js"

export class BranchesController {
  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await branchesService.getAll()
      res.json({ success: true, count: data.length, data })
    } catch (error) {
      next(error)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10)
      const data = await branchesService.getById(id)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await branchesService.create(req.body, req.user?.id)
      res.status(201).json({
        success: true,
        message: "تمت إضافة المقر بنجاح",
        data,
      })
    } catch (error) {
      next(error)
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10)
      const data = await branchesService.update(id, req.body, req.user?.id)
      res.json({
        success: true,
        message: "تم تحديث بيانات المقر بنجاح",
        data,
      })
    } catch (error) {
      next(error)
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10)
      await branchesService.delete(id, req.user?.id)
      res.json({
        success: true,
        message: "تم حذف المقر بنجاح",
      })
    } catch (error) {
      next(error)
    }
  }

  async addAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = parseInt(String(req.params.id), 10)
      const { person_id } = req.body
      const data = await branchesService.addAdmin(branchId, parseInt(String(person_id), 10), req.user?.id)
      res.json({
        success: true,
        message: "تم تعيين مسؤول المقر بنجاح",
        data,
      })
    } catch (error) {
      next(error)
    }
  }

  async removeAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = parseInt(String(req.params.id), 10)
      const personId = parseInt(String(req.params.personId), 10)
      const data = await branchesService.removeAdmin(branchId, personId, req.user?.id)
      res.json({
        success: true,
        message: "تمت إزالة المسؤول من المقر بنجاح",
        data,
      })
    } catch (error) {
      next(error)
    }
  }
}

export const branchesController = new BranchesController()
