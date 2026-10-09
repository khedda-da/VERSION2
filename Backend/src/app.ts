import express from "express"
import cors from "cors"
import morgan from "morgan"
import { config } from "./config/env.js"
import { errorHandler } from "./middleware/error.middleware.js"
import { initializeSchema } from "./db/schema.js"
import { seedDatabase } from "./db/seed.js"

// Routers
import authRoutes from "./modules/auth/auth.routes.js"
import personsRoutes from "./modules/persons/persons.routes.js"
import branchesRoutes from "./modules/branches/branches.routes.js"
import halaqatRoutes from "./modules/halaqat/halaqat.routes.js"
import sheikhsRoutes from "./modules/sheikhs/sheikhs.routes.js"
import studentsRoutes from "./modules/students/students.routes.js"
import rolesRoutes from "./modules/roles/roles.routes.js"
import usersRoutes from "./modules/users/users.routes.js"
import notificationsRoutes from "./modules/notifications/notifications.routes.js"
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js"
import reportsRoutes from "./modules/reports/reports.routes.js"
import auditRoutes from "./modules/audit/audit.routes.js"

let dbReadyPromise: Promise<void> | null = null

export function ensureDbReady(): Promise<void> {
  if (!dbReadyPromise) {
    dbReadyPromise = (async () => {
      await initializeSchema()
      await seedDatabase()
    })()
  }
  return dbReadyPromise
}

export function createApp() {
  const app = express()

  // Middlewares
  app.use(
    cors({
      origin: "*",
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  )

  app.use(express.json({ limit: "10mb" }))
  app.use(express.urlencoded({ extended: true }))

  if (config.nodeEnv !== "test") {
    app.use(morgan("dev"))
  }

  // Ensure DB schema and seeds are loaded (critical for serverless cold-starts on Vercel)
  app.use(async (_req, _res, next) => {
    try {
      await ensureDbReady()
      next()
    } catch (err) {
      next(err)
    }
  })

  // Health check endpoints
  const healthHandler = (_req: express.Request, res: express.Response) => {
    res.json({
      status: "healthy",
      service: "djam3iya-backend",
      version: "1.2.0",
      time: new Date().toISOString(),
    })
  }
  app.get("/health", healthHandler)
  app.get("/api/health", healthHandler)

  // API Routes
  app.use("/api/auth", authRoutes)
  app.use("/api/persons", personsRoutes)
  app.use("/api/branches", branchesRoutes)
  app.use("/api/halaqat", halaqatRoutes)
  app.use("/api/sheikhs", sheikhsRoutes)
  app.use("/api/students", studentsRoutes)
  app.use("/api/roles", rolesRoutes)
  app.use("/api/users", usersRoutes)
  app.use("/api/notifications", notificationsRoutes)
  app.use("/api/dashboard", dashboardRoutes)
  app.use("/api/reports", reportsRoutes)
  app.use("/api/audit", auditRoutes)

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `المسار غير موجود: ${req.method} ${req.originalUrl}`,
    })
  })

  // Global Error Handler
  app.use(errorHandler)

  return app
}

export const app = createApp()
export default app
