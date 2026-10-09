import React from "react"
import { Icon } from "./Icon"
import type { IconName } from "@/types"

export interface ButtonProps {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "ghost" | "danger"
  icon?: IconName
  onClick?: () => void
  type?: "button" | "submit" | "reset"
  className?: string
  disabled?: boolean
}

export function Button({
  children,
  variant = "primary",
  icon,
  onClick,
  type = "button",
  className = "",
  disabled = false,
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
    >
      {icon && <Icon name={icon} />}
      {children}
    </button>
  )
}
