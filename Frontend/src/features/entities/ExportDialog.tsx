import { useState } from "react"
import { Icon } from "@/components/ui/Icon"
import { Button } from "@/components/ui/Button"
import { IconButton } from "@/components/ui/IconButton"
import { errorMessage } from "@/services/api"
import type { ExportFormat } from "@/services/api"
import type { ExportRequest } from "./exportTypes"

interface ExportDialogProps {
  request: ExportRequest
  onClose: () => void
  onReady: (message: string) => void
}

const FORMAT_LABEL: Record<ExportFormat, string> = { xlsx: "Excel", csv: "CSV", pdf: "PDF" }

export function ExportDialog({ request, onClose, onReady }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>(request.formats[0])
  const [scope, setScope] = useState<"current" | "all">("current")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const run = async () => {
    setBusy(true)
    setError("")
    try {
      await request.run(format, scope)
      onReady("تم تنزيل الملف.")
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="modal-layer">
      <div className="dialog export-dialog" role="dialog" aria-modal="true">
        <div className="form-modal-head">
          <div>
            <strong>تصدير {request.title}</strong>
            <small>سيحترم الملف نطاق صلاحياتك الحالي.</small>
          </div>
          <IconButton icon="close" label="إغلاق" onClick={onClose} />
        </div>

        <div className="dialog-content">
          <fieldset>
            <legend>اختر التنسيق</legend>
            <div className="option-grid">
              {request.formats.map((item) => (
                <label className={format === item ? "selected" : ""} key={item}>
                  <input
                    type="radio"
                    name="format"
                    checked={format === item}
                    onChange={() => setFormat(item)}
                  />
                  <strong>{FORMAT_LABEL[item]}</strong>
                </label>
              ))}
            </div>
          </fieldset>
          {request.allowScope && (
            <fieldset>
              <legend>نطاق البيانات</legend>
              <label className="radio-row">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === "current"}
                  onChange={() => setScope("current")}
                />
                <span>
                  <strong>النتائج الحالية</strong>
                  <small>{request.count} سجلات تطابق البحث والفلاتر الحالية.</small>
                </span>
              </label>
              <label className="radio-row">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                />
                <span>
                  <strong>كل السجلات المسموح بها</strong>
                  <small>كل ما تسمح به صلاحياتك دون تطبيق الفلاتر.</small>
                </span>
              </label>
            </fieldset>
          )}
          {error && (
            <div className="info-alert" role="alert">
              <Icon name="warning" />
              <span>
                <small>{error}</small>
              </span>
            </div>
          )}
        </div>
        <div className="dialog-footer">
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button icon="download" onClick={run} disabled={busy}>
            {busy ? "جارٍ تحضير التصدير..." : "تصدير"}
          </Button>
        </div>
      </div>
    </div>
  )
}
