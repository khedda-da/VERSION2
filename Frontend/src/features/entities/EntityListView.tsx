import { useMemo, useState } from "react"
import { Icon } from "@/components/ui/Icon"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState, LoadingState } from "@/components/ui/StateViews"
import { EntityFilterDrawer } from "./EntityFilterDrawer"
import { buildEntityRows } from "./entityModel"
import { entityMeta, emptyEntityFilters } from "@/services/constants"
import { downloadCsv } from "@/services/api"
import { useData } from "@/services/DataContext"
import type { EntityType } from "@/types/navigation"
import type { EntityFilters } from "@/types/filters"
import type { ExportRequest } from "./exportTypes"

interface EntityListViewProps {
  type: EntityType
  onAdd: () => void
  onExport: (request: ExportRequest) => void
  onOpen: (type: EntityType, id: string, name: string) => void
}

export function EntityListView({ type, onAdd, onExport, onOpen }: EntityListViewProps) {
  const content = entityMeta[type]
  const data = useData()
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState<EntityFilters>(emptyEntityFilters)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const allRows = useMemo(
    () =>
      buildEntityRows(type, {
        sheikhs: data.sheikhs,
        halaqat: data.halaqat,
        branches: data.branches,
        roles: data.roles,
        users: data.users,
      }),
    [type, data.sheikhs, data.halaqat, data.branches, data.roles, data.users],
  )

  const activeFilters = Object.entries(filters).filter(([, value]) => value)
  const rows = allRows.filter((row) => {
    if (!`${row.name} ${row.col1} ${row.col2} ${row.badge}`.includes(query)) return false
    return activeFilters.every(([key, value]) => {
      const attribute = row.attrs[key as keyof typeof row.attrs]
      return Array.isArray(attribute) ? attribute.includes(value) : attribute === value
    })
  })

  // The matching data-key for this screen, to surface its own load error
  const loadError = data.errors[type]

  const exportRows = () =>
    onExport({
      title: content.title,
      count: rows.length,
      formats: ["csv"],
      run: async () =>
        downloadCsv(
          `${type}.csv`,
          ["الاسم", "النطاق / العلاقة", "التفاصيل", "الحالة"],
          rows.map((r) => [r.name, r.col1, r.col2, r.badge]),
        ),
    })

  return (
    <div className="page">
      <section className="page-heading">
        <div>
          <div className="page-title">{content.title}</div>
          <p>{content.subtitle}</p>
        </div>
        <Button icon="plus" onClick={onAdd}>
          {content.action}
        </Button>
      </section>

      <div className="toolbar">
        <label className="search-field">
          <Icon name="search" />
          <input
            aria-label={`بحث في ${content.title}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`ابحث في ${content.title}...`}
          />
        </label>
        <Button variant="secondary" icon="filter" onClick={() => setFiltersOpen(true)}>
          تصفية{" "}
          {activeFilters.length > 0 && (
            <span className="filter-count">{activeFilters.length}</span>
          )}
        </Button>
        <Button variant="secondary" icon="download" onClick={exportRows}>
          تصدير
        </Button>
      </div>

      {activeFilters.length > 0 && (
        <div className="filter-chips">
          {activeFilters.map(([key, value]) => (
            <span key={key}>
              {value}
              <button
                aria-label={`إزالة ${value}`}
                onClick={() => setFilters({ ...filters, [key]: "" })}
              >
                <Icon name="close" size={13} />
              </button>
            </span>
          ))}
          <button className="clear-filters" onClick={() => setFilters(emptyEntityFilters)}>
            مسح الكل
          </button>
        </div>
      )}

      <section className="entity-panel">
        <div className="entity-head">
          <span>الاسم</span>
          <span>النطاق / العلاقة</span>
          <span>التفاصيل</span>
          <span>الحالة</span>
          <span />
        </div>
        {data.loading && allRows.length === 0 ? (
          <LoadingState />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={() => void data.refresh([type])} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={content.icon}
            title={`لا توجد نتائج في ${content.title}.`}
            detail={
              allRows.length === 0
                ? "لا توجد سجلات بعد. ابدأ بإضافة أول سجل."
                : "لا توجد سجلات تطابق البحث والفلاتر الحالية."
            }
            action={allRows.length === 0 ? content.action : "مسح الفلاتر"}
            onAction={() => {
              if (allRows.length === 0) onAdd()
              else {
                setQuery("")
                setFilters(emptyEntityFilters)
              }
            }}
          />
        ) : (
          rows.map((row) => (
            <button
              className="entity-row"
              key={row.id}
              onClick={() => onOpen(type, row.id, row.name)}
            >
              <span className="person-cell">
                <span className="avatar">
                  <Icon name={content.icon} size={18} />
                </span>
                <strong>{row.name}</strong>
              </span>
              <span>{row.col1}</span>
              <span>{row.col2}</span>
              <span>
                <Badge tone={row.inactive ? "warning" : "success"}>{row.badge}</Badge>
              </span>
              <Icon name="arrow" />
            </button>
          ))
        )}
      </section>

      {filtersOpen && (
        <EntityFilterDrawer
          type={type}
          value={filters}
          onClose={() => setFiltersOpen(false)}
          onApply={(next) => {
            setFilters(next)
            setFiltersOpen(false)
          }}
        />
      )}
    </div>
  )
}
