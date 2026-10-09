import { Icon } from "@/components/ui/Icon"
import { Button } from "@/components/ui/Button"

interface ConfirmDialogProps {
  title: string
  detail: string
  confirmLabel?: string
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  title,
  detail,
  confirmLabel = "حذف",
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <div className="modal-layer nested">
      <div
        className="dialog confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-detail"
      >
        <span className="warning-icon">
          <Icon name="warning" />
        </span>
        <strong id="confirm-title">{title}</strong>
        <p id="confirm-detail">{detail}</p>
        <div className="dialog-footer">
          <Button variant="ghost" onClick={onCancel}>
            إلغاء
          </Button>
          <button className="btn btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
