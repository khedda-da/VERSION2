import type { Request, Response, NextFunction } from "express"
import { studentsService } from "./students.service.js"

export class StudentsController {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await studentsService.searchStudents(req.query, req.user)
      res.json({
        success: true,
        count: data.length,
        data,
      })
    } catch (error) {
      next(error)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id)
      const data = await studentsService.getById(id, req.user)
      res.json({
        success: true,
        data,
      })
    } catch (error) {
      next(error)
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await studentsService.create(req.body, req.user)
      res.status(201).json({
        success: true,
        message: "تمت إضافة الطالب بنجاح",
        data,
      })
    } catch (error) {
      next(error)
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id)
      const data = await studentsService.update(id, req.body, req.user)
      res.json({
        success: true,
        message: "تم تحديث بيانات الطالب بنجاح",
        data,
      })
    } catch (error) {
      next(error)
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id)
      await studentsService.delete(id, req.user)
      res.json({
        success: true,
        message: "تم حذف الطالب بنجاح",
      })
    } catch (error)
      {
      next(error)
    }
  }

  async exportList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const format = ((req.query.format as string) || "xlsx").toLowerCase() as
        | "xlsx"
        | "csv"
        | "pdf"
      const result = await studentsService.exportStudents(req.query, format, req.user)

      res.setHeader("Content-Type", result.contentType)
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.filename}"`,
      )
      res.send(result.buffer)
    } catch (error) {
      next(error)
    }
  }
}

export const studentsController = new StudentsController()
