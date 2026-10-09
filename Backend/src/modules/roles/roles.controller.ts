import type { Request, Response, NextFunction } from "express"
import { rolesService } from "./roles.service.js"

export class RolesController {
  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await rolesService.getAll()
      res.json({ success: true, count: data.length, data })
    } catch (error) {
      next(error)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10)
      const data = await rolesService.getById(id)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, scope } = req.body
      const data = await rolesService.create(name, scope || "central", req.user)
      res.status(201).json({
        success: true,
        message: "تم إنشاء الدور بنجاح",
        data,
      })
    } catch (error) {
      next(error)
    }
  }

  async assign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { person_id, role_id, branch_id } = req.body
      const result = await rolesService.assignRole(
        {
          person_id: parseInt(String(person_id), 10),
          role_id: parseInt(String(role_id), 10),
          branch_id: branch_id ? parseInt(String(branch_id), 10) : null,
        },
        req.user,
      )
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  async unassign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { person_id, role_id, branch_id } = req.body
      const result = await rolesService.unassignRole(
        parseInt(String(person_id), 10),
        parseInt(String(role_id), 10),
        branch_id ? parseInt(String(branch_id), 10) : undefined,
        req.user,
      )
      res.json(result)
    } catch (error) {
      next(error)
    }
  }
}

export const rolesController = new RolesController()
