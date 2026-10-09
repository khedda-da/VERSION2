import type { Request, Response, NextFunction } from "express"
import { personsService } from "./persons.service.js"

export class PersonsController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { person_type, search, gender } = req.query
      const data = await personsService.getAll({
        person_type: person_type as string,
        search: search as string,
        gender: gender as string,
      })
      res.json({ success: true, count: data.length, data })
    } catch (error) {
      next(error)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10)
      const data = await personsService.getById(id)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await personsService.create(req.body, req.user?.id)
      res.status(201).json({
        success: true,
        message: "تمت إضافة الشخص بنجاح",
        data,
      })
    } catch (error) {
      next(error)
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10)
      const data = await personsService.update(id, req.body, req.user?.id)
      res.json({
        success: true,
        message: "تم تحديث بيانات الشخص بنجاح",
        data,
      })
    } catch (error) {
      next(error)
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10)
      await personsService.delete(id, req.user?.id)
      res.json({
        success: true,
        message: "تم حذف الشخص بنجاح",
      })
    } catch (error) {
      next(error)
    }
  }
}

export const personsController = new PersonsController()
