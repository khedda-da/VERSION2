import { useState } from "react"
import { Icon, Button, EmptyState, LoadingState, ErrorState } from "@/components/ui"
import { api, errorMessage } from "@/services/api"
import type { ExportFormat } from "@/services/api"
import { useAuth } from "@/services/AuthContext"
import { levelLabel } from "@/utils/format"
import type { IconName, ReportKey, ReportRow } from "@/types"

export interface ReportsViewProps {
  onMessage: (message: string) => void
}

const availableReports: { key: ReportKey; title: string; desc: string; icon: IconName; unit: string }[] = [
  { key: "branch", title: "الطلاب حسب المقر", desc: "توزيع وأعداد الطلاب في كل مقر", icon: "branch", unit: "طالبا" },
  { key: "level", title: "الطلاب حسب المستوى الدراسي", desc: "ابتدائي، متوسط، ثانوي وجامعي", icon: "school", unit: "طالبا" },
  { key: "halaqa", title: "الطلاب حسب الحلقة", desc: "الحلقات والشيوخ المرتبطون", icon: "book", unit: "طالبا" },
  { key: "sheikh", title: "الطلاب حسب الشيخ", desc: "أعداد الطلاب حسب الشيخ والحلقة", icon: "user", unit: "طالبا" },
  { key: "trends", title: "إحصائيات التسجيل", desc: "التسجيلات حسب تاريخ التسجيل", icon: "calendar", unit: "تسجيلا" },
]

/** Normalise the different report payloads into label/value rows. */
function toRows(key: ReportKey, data: Record<string, unknown>[]): ReportRow[] {
  const str = (v: unknown) => (v == null ? "" : String(v))
  switch (key) {
    case "branch":
      return data.map((d) => ({
        label: str(d.branchName),
        sublabel: str(d.location),
        value: Number(d.studentCount),
        extra: `${d.halaqaCount} حلقات`,
      }))
    case "level":
      return data.map((d) => ({
        label: levelLabel[str(d.level)] || str(d.level),
        value: Number(d.studentCount),
      }))
    case "halaqa":
      return data.map((d) => ({
        label: str(d.halaqaName),
        sublabel: `${str(d.branchName)} · ${str(d.sheikh)}`,
        value: Number(d.studentCount),
        extra: str(d.level),
      }))
    case "sheikh":
      return data.map((d) => ({
        label: str(d.sheikhName),
        sublabel: str(d.phone),
        value: Number(d.studentCount),
        extra: `${d.halaqaCount} حلقات`,
      }))
    case "trends":
      return data.map((d) => ({ label: str(d.date).slice(0, 10), value: Number(d.count) }))
  }
}

export function ReportsView({ onMessage }: ReportsViewProps) {
  const { user } = useAuth()
  const [active, setActive] = useState<(typeof availableReports)[number] | null>(null)
  const [rows, setRows] = useState<ReportRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const generate = async (report: (typeof availableReports)[number]) => {
    setActive(report)
    setRows(null)
    setError("")
    setLoading(true)
    try {
      setRows(toRows(report.key, await api.getReport(report.key)))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const exportAs = async (format: ExportFormat) => {
    if (!active) return
    try {
      await api.exportReport(active.key, format)
      onMessage("تم تنزيل الملف.")
    } catch (err) {
      onMessage(errorMessage(err))
    }
  }

  const total = rows?.reduce((sum, r) => sum + r.value, 0) ?? 0
  const max = Math.max(1, ...(rows ?? []).map((r) => r.value))

  return (
    <div className="page">
      <section className="page-heading">
        <div>
          <div className="page-title">التقارير</div>
          <p>أنشئ تقارير دقيقة ضمن نطاق صلاحياتك.</p>
        </div>
      </section>

      <div className="report-banner">
        <div>
          <Icon name="shield" />
          <span>
            <strong>
              نطاق التقرير: {user?.isCentral ? "كل المقرات" : user?.isBranchAdmin ? "مقرك" : "حلقاتك"}
            </strong>
            <small>
              {user?.isCentral ? "لديك صلاحية التقارير المركزية." : "تُحدَّد البيانات بحسب صلاحياتك."}
            </small>
          </span>
        </div>
      </div>

      {!active ? (
        <>
          <div className="report-grid">
            {availableReports.map((item) => (
              <button className="report-card" key={item.key} onClick={() => void generate(item)}>
                <span>
                  <Icon name={item.icon} />
                </span>
                <strong>{item.title}</strong>
                <small>{item.desc}</small>
                <b>
                  إنشاء التقرير <Icon name="arrow" size={16} />
                </b>
              </button>
            ))}
          </div>
          <EmptyState
            icon="chart"
            title="لم يتم إنشاء تقرير بعد."
            detail="اختر أحد التقارير أعلاه لعرض البيانات الحالية."
          />
        </>
      ) : (
        <section className="report-builder">
          <div className="section-title">
            <div>
              <strong>{active.title}</strong>
              <small>{active.desc}</small>
            </div>
            <button
              onClick={() => {
                setActive(null)
                setRows(null)
                setError("")
              }}
            >
              اختيار تقرير آخر
            </button>
          </div>

          {loading && <LoadingState rows={3} />}
          {error && <ErrorState message={error} onRetry={() => void generate(active)} />}
          {rows && rows.length === 0 && (
            <EmptyState icon="chart" title="لا توجد بيانات." detail="لا توجد سجلات ضمن نطاقك لهذا التقرير." />
          )}
          {rows && rows.length > 0 && (
            <div className="report-result">
              <div className="success-mark">
                <Icon name="check" />
              </div>
              <div>
                <strong>تم إنشاء التقرير.</strong>
                <small>
                  الإجمالي: {total.toLocaleString("en-US")} {active.unit} في {rows.length} صفوف.
                </small>
              </div>
              <div className="bar-chart" style={{ width: "100%" }}>
                {rows.map((r) => (
                  <div className="bar-row" key={`${r.label}-${r.sublabel ?? ""}`}>
                    <span>
                      {r.label}
                      {r.sublabel ? <small> · {r.sublabel}</small> : null}
                    </span>
                    <div>
                      <i style={{ width: `${Math.round((r.value / max) * 100)}%` }} />
                    </div>
                    <strong>{r.value}</strong>
                  </div>
                ))}
              </div>
              <div className="export-actions">
                <Button variant="secondary" onClick={() => void exportAs("pdf")}>
                  PDF
                </Button>
                <Button variant="secondary" onClick={() => void exportAs("xlsx")}>
                  Excel
                </Button>
                <Button variant="secondary" onClick={() => void exportAs("csv")}>
                  CSV
                </Button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
