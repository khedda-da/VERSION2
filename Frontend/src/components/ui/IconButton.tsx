import { Icon } from "./Icon"
import type { IconName } from "@/types"

export interface IconButtonProps {
  icon: IconName
  label: string
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  active?: boolean
  className?: string
  type?: "button" | "submit"
}

export function IconButton({
  icon,
  label,
  onClick,
  active,
  className = "",
  type = "button",
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`icon-button ${active ? "active" : ""} ${className}`}
      onClick={onClick}
      type={type}
    >
      <Icon name={icon} />
    </button>
  )
}
