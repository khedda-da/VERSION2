import { useState } from "react"
import { IconButton } from "@/components/ui"
import { entityMeta, LEVELS } from "@/services/constants"
import { useData } from "@/services/DataContext"
import type { EntityType, EntityFilters } from "@/types"

export interface EntityFilterDrawerProps {
  type: EntityType
  value: EntityFilters
  onClose: () => void
  onApply: (filters: EntityFilters) => void
}

export function EntityFilterDrawer({ type, value, onClose, onApply }: EntityFilterDrawerProps) {
  const { branches, halaqat, sheikhs } = useData()
  const [draft, setDraft] = useState(value)
  const update = (key: keyof EntityFilters, val: string) => setDraft({ ...draft, [key]: val })
  const isSheikh = type === "sheikhs"
  const isHalaqa = type === "halaqat"

  return (
    <div className="drawer-layer">
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="filter-drawer">
        <div className="drawer-head">
          <div>
            <strong>تصفية {entityMeta[type].title}</strong>
            <small>اجمع بين عدة فلاتر لدقة أكبر</small>
          </div>
          <IconButton icon="close" label="إغلاق" onClick={onClose} />
        </div>
        <div className="drawer-content">
          {(isSheikh || isHalaqa) && (
            <label>
              المقر
              <select value={draft.branch} onChange={(e) => update("branch", e.target.value)}>
                <option value="">كل المقرات</option>
                {branches.map((b) => (
                  <option key={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
          )}
          {isSheikh && (
            <label>
              الحلقة
              <select value={draft.halaqa} onChange={(e) => update("halaqa", e.target.value)}>
                <option value="">كل الحلقات</option>
                {halaqat.map((h) => (
                  <option key={h.id}>{h.name}</option>
                ))}
              </select>
            </label>
          )}
          {isHalaqa && (
            <>
              <label>
                الشيخ
                <select value={draft.sheikh} onChange={(e) => update("sheikh", e.target.value)}>
                  <option value="">كل الشيوخ</option>
                  {sheikhs.map((s) => (
                    <option key={s.personId}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label>
                المستوى
                <select
                  value={draft.level || ""}
                  onChange={(e) => update("level", e.target.value)}
                >
                  <option value="">كل المستويات</option>
                  {LEVELS.map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          <label>
            الحالة
            <select value={draft.status} onChange={(e) => update("status", e.target.value)}>
              <option value="">كل الحالات</option>
              <option>نشط</option>
              <option>{isHalaqa ? "متوقف" : "غير نشط"}</option>
            </select>
          </label>
        </div>
        <div className="drawer-footer">
          <button
            className="clear-filters"
            onClick={() => {
              const empty: EntityFilters = { branch: "", halaqa: "", sheikh: "", status: "" }
              setDraft(empty)
              onApply(empty)
            }}
          >
            إعادة الضبط
          </button>
          <button className="btn btn-primary" onClick={() => onApply(draft)}>
            تطبيق الفلاتر
          </button>
        </div>
      </aside>
    </div>
  )
}
