import React from "react"

export interface BadgeProps {
  children: React.ReactNode
  tone?: "neutral" | "success" | "info" | "warning" | "danger"
  className?: string
}

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: BadgeProps) {
  return <span className={`badge badge-${tone} ${className}`}>{children}</span>
}
