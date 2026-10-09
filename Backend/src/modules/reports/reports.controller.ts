import type { Request, Response, NextFunction } from "express"
import { reportsService } from "./reports.service.js"

export class ReportsController {
  async getByBranch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportsService.getStudentsByBranch(req.user)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  async getByLevel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportsService.getStudentsByLevel(req.user)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  async getByHalaqa(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportsService.getStudentsByHalaqa(req.user)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  async getBySheikh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportsService.getStudentsBySheikh(req.user)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  async getTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportsService.getEnrollmentTrends(req.user)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  async exportReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const type = (req.query.type as string) || "branch"
      const format = ((req.query.format as string) || "xlsx").toLowerCase() as
        | "xlsx"
        | "csv"
        | "pdf"
      const result = await reportsService.exportReport(type, format, req.user)

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

export const reportsController = new ReportsController()
