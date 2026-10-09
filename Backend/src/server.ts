import { app, ensureDbReady } from "./app.js"
import { config } from "./config/env.js"

export default app

async function startServer() {
  if (process.env.VERCEL) {
    // In Vercel serverless environment, the app is imported and executed per request
    return
  }

  try {
    console.log("==================================================")
    console.log(" جمعية تحفيظ القرآن الكريم - Backend API Server ")
    console.log(" الإصدار 1.2 | البيئة:", config.nodeEnv)
    console.log("==================================================")

    await ensureDbReady()

    const server = app.listen(config.port, () => {
      console.log(`[Server] API is running on http://localhost:${config.port}`)
      console.log(`[Server] Health check: http://localhost:${config.port}/health`)
      console.log(`[Server] Endpoints base: http://localhost:${config.port}/api`)
    })

    const handleShutdown = () => {
      console.log("\n[Server] Shutting down gracefully...")
      server.close(() => {
        console.log("[Server] Closed HTTP server.")
        process.exit(0)
      })
    }

    process.on("SIGINT", handleShutdown)
    process.on("SIGTERM", handleShutdown)
  } catch (error) {
    console.error("[Server] Fatal startup error:", error)
    process.exit(1)
  }
}

startServer()
