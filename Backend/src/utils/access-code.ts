import crypto from "node:crypto"
import type { Request } from "express"
import { config } from "../config/env.js"
import { AppError } from "../middleware/error.middleware.js"

const MAX_FAILURES = 5
const WINDOW_MS = 15 * 60 * 1000
const failures = new Map<string, { count: number; first: number }>()

function clientKey(req: Request): string {
  return req.ip || req.socket?.remoteAddress || "unknown"
}

function sameCode(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest()
  const hb = crypto.createHash("sha256").update(b).digest()
  return crypto.timingSafeEqual(ha, hb)
}

/**
 * Throws unless `code` matches the configured account code.
 * Repeated wrong attempts from one client are temporarily blocked (best effort,
 * in-memory per server instance).
 */
export function assertAccountCode(req: Request, code: unknown): void {
  const key = clientKey(req)
  const now = Date.now()
  const entry = failures.get(key)
  if (entry && now - entry.first > WINDOW_MS) failures.delete(key)

  const current = failures.get(key)
  if (current && current.count >= MAX_FAILURES) {
    throw new AppError("محاولات خاطئة كثيرة. حاول مرة أخرى بعد 15 دقيقة.", 429)
  }

  const provided = typeof code === "string" ? code.trim() : ""
  if (!provided || !sameCode(provided, config.accountCode)) {
    const f = failures.get(key) ?? { count: 0, first: now }
    f.count += 1
    failures.set(key, f)
    throw new AppError("رمز الإنشاء غير صحيح.", 403)
  }

  failures.delete(key)
}
