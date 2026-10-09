import { Icon } from "@/components/ui/Icon"
import { Button } from "@/components/ui/Button"
import type { FormKind } from "@/types/navigation"

interface SuccessDialogProps {
  kind: FormKind
  message: string
  onClose: () => void
  onPrimary: () => void
  onSecondary: () => void
}

const PRIMARY_LABELS: Record<FormKind, string> = {
  student: "عرض الطالب",
  sheikh: "عرض الملف",
  halaqa: "عرض الحلقة",
  branch: "عرض المقر",
  role: "عرض التفاصيل",
  user: "عرض التفاصيل",
}

const SECONDARY_LABELS: Record<FormKind, string> = {
  student: "إضافة طالب آخر",
  sheikh: "تعيين حلقة أخرى",
  halaqa: "إضافة طلاب",
  branch: "إضافة حلقة",
  role: "إضافة آخر",
  user: "إضافة آخر",
}

export function SuccessDialog({
  kind,
  message,
  onClose,
  onPrimary,
  onSecondary,
}: SuccessDialogProps) {
  return (
    <div className="modal-layer">
      <div className="dialog dialog-state" role="dialog" aria-modal="true">
        <span className="success-mark">
          <Icon name="check" />
        </span>
        <strong>{message}</strong>
        <p>تم حفظ البيانات وأصبحت متاحة ضمن نطاق صلاحياتك.</p>
        <Button onClick={onPrimary}>{PRIMARY_LABELS[kind]}</Button>
        <Button variant="secondary" onClick={onSecondary}>
          {SECONDARY_LABELS[kind]}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          إغلاق
        </Button>
      </div>
    </div>
  )
}
