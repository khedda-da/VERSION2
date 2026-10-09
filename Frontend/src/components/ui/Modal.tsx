import React, { useEffect } from "react"
import { IconButton } from "./IconButton"

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: React.ReactNode
  size?: "sm" | "md" | "lg"
  className?: string
  nested?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = "md",
  className = "",
  nested = false,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className={`modal-layer ${nested ? "nested" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`dialog dialog-${size} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {(title || subtitle) && (
          <div className="form-modal-head">
            <div>
              {title && <strong>{title}</strong>}
              {subtitle && <small>{subtitle}</small>}
            </div>
            <IconButton icon="close" label="إغلاق" onClick={onClose} />
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
