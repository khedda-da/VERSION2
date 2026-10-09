import { Icon, Button, LoadingState, ErrorState } from "@/components/ui"
import { api } from "@/services/api"
import { useAsync } from "@/services/useAsync"
import { useAuth } from "@/services/AuthContext"
import { useData } from "@/services/DataContext"
import { firstName, greeting, studentsLabel } from "@/utils/format"
import type { Screen, FormKind, IconName, EntityType } from "@/types"

export interface DashboardViewProps {
  navigate: (s: Screen) => void
  onAdd: (kind: FormKind) => void
  onExport: () => void
  onOpenEntity: (type: EntityType, id: string, name: string) => void
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string
  value: string
  detail: string
  icon: IconName
}) {
  return (
    <div className="metric">
      <div className="metric-icon">
        <Icon name={icon} />
      </div>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </div>
  )
}

export function DashboardView({
  navigate,
  onAdd,
  onExport,
  onOpenEntity,
}: DashboardViewProps) {
  const { user } = useAuth()
  const { halaqat } = useData()
  const stats = useAsync(() => api.getDashboardStats(), [])

  const todayFormatted = new Intl.DateTimeFormat("ar-DZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date())

  const m = stats.data?.metrics
  const topHalaqat = [...halaqat].sort((a, b) => b.studentCount - a.studentCount).slice(0, 3)

  return (
    <div className="page">
      <section className="welcome-row">
        <div>
          <div className="eyebrow">{todayFormatted}</div>
          <div className="page-title">
            {greeting()}، {user ? firstName(user.fullName) : ""}
          </div>
          <p>إليك ملخص واضح لما يحدث في الجمعية اليوم.</p>
        </div>
        <div className="quick-actions">
          <Button variant="secondary" icon="download" onClick={onExport}>
            تصدير
          </Button>
          <Button icon="plus" onClick={() => onAdd("student")}>
            إضافة طالب
          </Button>
        </div>
      </section>

      {stats.loading && !stats.data ? (
        <LoadingState />
      ) : stats.error || !stats.data || !m ? (
        <ErrorState message={stats.error || "تعذر تحميل الإحصائيات."} onRetry={stats.reload} />
      ) : (
        <>
          <div className="metrics-grid">
            <MetricCard
              label="إجمالي الطلاب"
              value={m.totalStudents.toLocaleString("en-US")}
              detail="ضمن نطاق صلاحياتك"
              icon="school"
            />
            <MetricCard
              label="الشيوخ"
              value={m.totalSheikhs.toLocaleString("en-US")}
              detail="يشرفون على الحلقات"
              icon="user"
            />
            <MetricCard
              label="الحلقات"
              value={m.totalHalaqat.toLocaleString("en-US")}
              detail={`${m.activeHalaqat} حلقة نشطة`}
              icon="book"
            />
            <MetricCard
              label="المقرات"
              value={m.totalBranches.toLocaleString("en-US")}
              detail={
                m.activeBranches === m.totalBranches
                  ? "جميعها نشطة"
                  : `${m.activeBranches} نشطة`
              }
              icon="branch"
            />
          </div>

          <div className="dashboard-grid">
            <section className="panel span-2">
              <div className="panel-head">
                <div>
                  <strong>الطلاب حسب المقر</strong>
                  <small>توزيع الطلاب المسجلين</small>
                </div>
                <button className="text-action" onClick={() => navigate("branches")}>
                  عرض المقرات <Icon name="arrow" size={16} />
                </button>
              </div>
              <div className="bar-chart">
                {stats.data.studentsByBranch.map(({ name, val, width }) => (
                  <div className="bar-row" key={name}>
                    <span>{name}</span>
                    <div>
                      <i style={{ width: `${width}%` }} />
                    </div>
                    <strong>{val}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <strong>إجراءات سريعة</strong>
                  <small>المهام الأكثر استخداما</small>
                </div>
              </div>
              <div className="action-list">
                {[
                  { label: "إضافة طالب جديد", icon: "school" as IconName, id: "student" as FormKind },
                  { label: "إنشاء حلقة", icon: "book" as IconName, id: "halaqa" as FormKind },
                  { label: "إضافة شيخ", icon: "user" as IconName, id: "sheikh" as FormKind },
                  { label: "إضافة مقر", icon: "branch" as IconName, id: "branch" as FormKind },
                ].map(({ label, icon, id }) => (
                  <button key={label} onClick={() => onAdd(id)}>
                    <span>
                      <Icon name={icon} />
                    </span>
                    {label}
                    <Icon name="arrow" size={17} />
                  </button>
                ))}
              </div>
            </section>

            <section className="panel span-2">
              <div className="panel-head">
                <div>
                  <strong>الحلقات الأكثر طلابا</strong>
                  <small>حسب عدد الطلاب المسجلين</small>
                </div>
                <button className="text-action" onClick={() => navigate("halaqat")}>
                  عرض الكل
                </button>
              </div>
              <div className="halaqa-list">
                {topHalaqat.length === 0 && <small>لا توجد حلقات بعد.</small>}
                {topHalaqat.map((h, i) => (
                  <button key={h.id} onClick={() => onOpenEntity("halaqat", String(h.id), h.name)}>
                    <span className="rank">{i + 1}</span>
                    <span>
                      <strong>{h.name}</strong>
                      <small>
                        {h.branch} · {h.sheikh}
                      </small>
                    </span>
                    <span className="student-count">
                      <strong>{h.studentCount}</strong>
                      <small>{studentsLabel(h.studentCount).replace(/^\d+ /, "")}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <strong>آخر النشاطات</strong>
                  <small>آخر الطلاب المسجلين</small>
                </div>
                {user?.isCentral && (
                  <button className="text-action" onClick={() => navigate("activity")}>
                    السجل
                  </button>
                )}
              </div>
              <div className="timeline">
                {stats.data.recentActivity.length === 0 && <small>لا يوجد نشاط بعد.</small>}
                {stats.data.recentActivity.map(([actor, action, target, branch, time]) => (
                  <div className="timeline-item" key={`${target}-${time}`}>
                    <span className="timeline-dot" />
                    <div>
                      <strong>
                        {actor} · {action}
                      </strong>
                      <span>
                        {target} — {branch}
                      </span>
                      <small>{time}</small>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
