import { useState } from "react"
import { Icon, Button, Badge, EmptyState, LoadingState, ErrorState } from "@/components/ui"
import { api } from "@/services/api"
import type { AuditEntry } from "@/services/api"
import { useAsync } from "@/services/useAsync"
import type { ActivityItem } from "@/types"

/** Best human-readable name of the record an audit entry is about. */
function targetOf(entry: AuditEntry): string {
  const values = (entry.newValues || entry.oldValues || {}) as Record<string, unknown>
  const pick = values.name ?? values.full_name ?? values.username
  return typeof pick === "string" && pick ? pick : `#${entry.recordId ?? "—"}`
}

export function toActivityItems(entries: AuditEntry[]): ActivityItem[] {
  return entries.map((entry) => ({
    id: entry.id,
    userName: entry.user,
    action: `${entry.actionLabel} ${entry.tableLabel}`,
    target: targetOf(entry),
    meta: entry.tableLabel,
    timeAgo: entry.timestamp,
    tableName: entry.tableName,
    recordId: entry.recordId,
    actionType: entry.action,
  }))
}

const TONE: Record<string, "success" | "info" | "danger"> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "danger",
}

export interface ActivityListProps {
  compact?: boolean
  items: ActivityItem[]
}

export function ActivityList({ compact = false, items }: ActivityListProps) {
  return (
    <section className={`activity-feed ${compact ? "compact" : ""}`}>
      {items.map((item) => (
        <div key={item.id}>
          <span className="avatar">{item.userName.slice(0, 2)}</span>
          <p>
            <strong>{item.userName}</strong> {item.action} <b>{item.target}</b>
            <small>
              <Icon name="clock" size={14} /> {item.timeAgo}
            </small>
          </p>
          <Badge tone={TONE[item.actionType || ""] || "info"}>
            {item.actionType === "CREATE" ? "إضافة" : item.actionType === "DELETE" ? "حذف" : "تحديث"}
          </Badge>
        </div>
      ))}
    </section>
  )
}

const ACTION_FILTERS = [
  { value: "", label: "كل العمليات" },
  { value: "CREATE", label: "إضافة" },
  { value: "UPDATE", label: "تعديل" },
  { value: "DELETE", label: "حذف" },
]

export function ActivityView() {
  const [query, setQuery] = useState("")
  const [action, setAction] = useState("")
  const { data, loading, error, reload } = useAsync(() => api.getAudit(200), [])

  const items = toActivityItems(data ?? [])
  const rows = items
    .filter((item) => `${item.userName} ${item.action} ${item.target}`.includes(query))
    .filter((item) => !action || item.actionType === action)

  return (
    <div className="page">
      <section className="page-heading">
        <div>
          <div className="page-title">سجل النشاط</div>
          <p>سجل واضح للمساءلة: من قام بماذا، ومتى.</p>
        </div>
      </section>

      <div className="toolbar">
        <label className="search-field">
          <Icon name="search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="بحث النشاط"
            placeholder="ابحث عن مستخدم أو إجراء..."
          />
        </label>
        <label className="search-field">
          <Icon name="filter" />
          <select value={action} onChange={(e) => setAction(e.target.value)} aria-label="نوع العملية">
            {ACTION_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <Button variant="secondary" onClick={reload}>
          تحديث
        </Button>
      </div>

      {loading && !data ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : rows.length ? (
        <ActivityList items={rows} />
      ) : (
        <EmptyState
          icon="activity"
          title="لا يوجد نشاط يطابق فلاترك."
          detail="جرّب تغيير البحث أو نوع العملية."
          action="مسح الفلاتر"
          onAction={() => {
            setQuery("")
            setAction("")
          }}
        />
      )}
    </div>
  )
}
