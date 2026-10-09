import type { Request, Response, NextFunction } from "express"
import { auditService } from "./audit.service.js"

export class AuditController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50
      const data = await auditService.getAll(limit)
      res.json({ success: true, count: data.length, data })
    } catch (error) {
      next(error)
    }
  }
}

export const auditController = new AuditController()
