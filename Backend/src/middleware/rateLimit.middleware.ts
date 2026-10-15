import type { Request, Response, NextFunction } from "express"

/**
 * Tiny in-memory fixed-window limiter (no extra dependency).
 * On serverless hosts each instance keeps its own counters, so treat it as
 * basic spam protection rather than a hard guarantee.
 */
export function rateLimit(options: { windowMs: number; max: number; message: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>()

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now()
    const key = req.ip || "unknown"

    // Opportunistic cleanup so the map cannot grow forever.
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k)
    }

    let entry = hits.get(key)
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + options.windowMs }
      hits.set(key, entry)
    }
    entry.count += 1

    if (entry.count > options.max) {
      res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)))
      res.status(429).json({ success: false, message: options.message })
      return
    }
    next()
  }
}
