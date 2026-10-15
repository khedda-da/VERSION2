import app, { ensureDbReady } from "../Backend/dist/app.js"

export default async function handler(req, res) {
  try {
    await ensureDbReady()
    return app(req, res)
  } catch (err) {
    console.error("[Vercel Serverless Function Error]", err)
    return res.status(500).json({
      success: false,
      message: err?.message || "Internal server error during DB initialization",
      details: String(err),
    })
  }
}
