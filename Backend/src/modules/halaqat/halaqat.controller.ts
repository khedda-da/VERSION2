import type { Request, Response, NextFunction } from "express"
import { halaqatService } from "./halaqat.service.js"

export class HalaqatController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { branch_id, level, search } = req.query
      const data = await halaqatService.getAll(req.user, {
        branch_id: branch_id ? parseInt(String(branch_id), 10) : undefined,
        level: level as string,
        search: search as string,
      })
      res.json({ success: true, count: data.length, data })
    } catch (error) {
      next(error)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10)
      const data = await halaqatService.getById(id, req.user)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await halaqatService.create(req.body, req.user)
      res.status(201).json({
        success: true,
        message: "تم إنشاء الحلقة بنجاح",
        data,
      })
    } catch (error) {
      next(error)
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10)
      const data = await halaqatService.update(id, req.body, req.user)
      res.json({
        success: true,
        message: "تم تحديث بيانات الحلقة بنجاح",
        data,
      })
    } catch (error) {
      next(error)
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10)
      await halaqatService.delete(id, req.user)
      res.json({
        success: true,
        message: "تم حذف الحلقة بنجاح",
      })
    } catch (error) {
      next(error)
    }
  }

  async assignTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const halaqaId = parseInt(String(req.params.id), 10)
      const { person_id } = req.body
      await halaqatService.assignTeacher(halaqaId, parseInt(String(person_id), 10), req.user?.id)
      const data = await halaqatService.getById(halaqaId, req.user)
      res.json({
        success: true,
        message: "تم تعيين الشيخ للحلقة بنجاح",
        data,
      })
    } catch (error) {
      next(error)
    }
  }

  async removeTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const halaqaId = parseInt(String(req.params.id), 10)
      const personId = parseInt(String(req.params.personId), 10)
      await halaqatService.removeTeacher(halaqaId, personId, req.user?.id)
      const data = await halaqatService.getById(halaqaId, req.user)
      res.json({
        success: true,
        message: "تمت إزالة الشيخ من الحلقة",
        data,
      })
    } catch (error) {
      next(error)
    }
  }

  async enrollStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const halaqaId = parseInt(String(req.params.id), 10)
      const { person_id } = req.body
      await halaqatService.enrollStudent(halaqaId, parseInt(String(person_id), 10), req.user?.id)
      const data = await halaqatService.getById(halaqaId, req.user)
      res.json({
        success: true,
        message: "تم تسجيل الطالب في الحلقة بنجاح",
        data,
      })
    } catch (error) {
      next(error)
    }
  }

  async unenrollStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const halaqaId = parseInt(String(req.params.id), 10)
      const personId = parseInt(String(req.params.personId), 10)
      await halaqatService.unenrollStudent(halaqaId, personId, req.user?.id)
      const data = await halaqatService.getById(halaqaId, req.user)
      res.json({
        success: true,
        message: "تم إلغاء تسجيل الطالب من الحلقة",
        data,
      })
    } catch (error) {
      next(error)
    }
  }
}

export const halaqatController = new HalaqatController()
