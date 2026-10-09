import { Icon } from "./Icon"
import { Button } from "./Button"
import type { IconName } from "@/types"

export interface EmptyStateProps {
  icon: IconName
  title: string
  detail: string
  action?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon,
  title,
  detail,
  action,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`empty-state ${className}`}>
      <span>
        <Icon name={icon} size={24} />
      </span>
      <strong>{title}</strong>
      <p>{detail}</p>
      {action && onAction && (
        <Button variant="secondary" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  )
}
