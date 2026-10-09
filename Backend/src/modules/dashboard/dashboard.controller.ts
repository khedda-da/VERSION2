import type { Request, Response, NextFunction } from "express"
import { dashboardService } from "./dashboard.service.js"

export class DashboardController {
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getStats(req.user)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }
}

export const dashboardController = new DashboardController()
