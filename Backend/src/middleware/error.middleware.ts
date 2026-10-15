import type { Request, Response, NextFunction } from "express"

export class AppError extends Error {
  public statusCode: number
  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error("[Error Handler]", err)

  const status =
    err?.statusCode || err?.status || (err instanceof AppError ? err.statusCode : null)
  if (status && typeof status === "number" && status >= 400 && status < 500) {
    res.status(status).json({
      success: false,
      message: err.message || "طلب غير صالح",
    })
    return
  }

  // Handle SQLite constraint violation or PostgreSQL error
  if (err.message && err.message.includes("Maximum number of admins per branch is 3")) {
    res.status(400).json({
      success: false,
      message: "تم بلوغ الحد الأقصى لمسؤولي المقر (3 مسؤولين كحد أقصى).",
    })
    return
  }

  if (err.message && (err.message.includes("UNIQUE constraint failed") || err.code === "23505")) {
    res.status(409).json({
      success: false,
      message: "البيانات موجودة مسبقاً ولا يمكن تكرارها.",
    })
    return
  }

  res.status(500).json({
    success: false,
    message: err?.message || "حدث خطأ داخلي في الخادم. يرجى المحاولة لاحقاً.",
    ...(process.env.NODE_ENV !== "production" ? { details: String(err) } : {}),
  })
}
