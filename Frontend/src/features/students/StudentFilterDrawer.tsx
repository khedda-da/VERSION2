import { useState } from "react"
import { IconButton } from "@/components/ui"
import { useData } from "@/services/DataContext"
import { LEVELS } from "@/services/constants"
import type { StudentFilters } from "@/types"

export interface StudentFilterDrawerProps {
  value: StudentFilters
  onClose: () => void
  onApply: (filters: StudentFilters) => void
}

export function StudentFilterDrawer({
  value,
  onClose,
  onApply,
}: StudentFilterDrawerProps) {
  const { branches, halaqat, sheikhs } = useData()
  const [draft, setDraft] = useState(value)
  const update = (key: keyof StudentFilters, val: string) =>
    setDraft({ ...draft, [key]: val })

  return (
    <div className="drawer-layer">
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="filter-drawer">
        <div className="drawer-head">
          <div>
            <strong>تصفية الطلاب</strong>
            <small>اجمع بين عدة فلاتر لدقة أكبر</small>
          </div>
          <IconButton icon="close" label="إغلاق" onClick={onClose} />
        </div>
        <div className="drawer-content">
          <label>
            المقر
            <select
              value={draft.branch}
              onChange={(e) => update("branch", e.target.value)}
            >
              <option value="">كل المقرات</option>
              {branches.map((b) => (
                <option key={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <label>
            الحلقة
            <select
              value={draft.halaqa}
              onChange={(e) => update("halaqa", e.target.value)}
            >
              <option value="">كل الحلقات</option>
              {halaqat.map((h) => (
                <option key={h.id}>{h.name}</option>
              ))}
            </select>
          </label>
          <label>
            الشيخ
            <select
              value={draft.sheikh}
              onChange={(e) => update("sheikh", e.target.value)}
            >
              <option value="">كل الشيوخ</option>
              {sheikhs.map((s) => (
                <option key={s.personId}>{s.name}</option>
              ))}
            </select>
          </label>
          <label>
            المستوى الدراسي
            <select
              value={draft.level}
              onChange={(e) => update("level", e.target.value)}
            >
              <option value="">كل المستويات</option>
              {LEVELS.map((level) => (
                <option key={level}>{level}</option>
              ))}
            </select>
          </label>
          <label>
            المؤسسة التعليمية
            <input
              value={draft.school}
              onChange={(e) => update("school", e.target.value)}
              placeholder="مثال: ثانوية ابن خلدون"
            />
          </label>
          <div className="two-fields">
            <label>
              أصغر سن
              <input
                type="number"
                value={draft.minAge}
                onChange={(e) => update("minAge", e.target.value)}
                placeholder="7"
              />
            </label>
            <label>
              أكبر سن
              <input
                type="number"
                value={draft.maxAge}
                onChange={(e) => update("maxAge", e.target.value)}
                placeholder="25"
              />
            </label>
          </div>
        </div>
        <div className="drawer-footer">
          <button
            className="clear-filters"
            onClick={() => {
              const empty: StudentFilters = {
                branch: "",
                halaqa: "",
                sheikh: "",
                level: "",
                school: "",
                minAge: "",
                maxAge: "",
              }
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
