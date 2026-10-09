import { useMemo, useState } from "react"
import { Icon, EmptyState } from "@/components/ui"
import { useData } from "@/services/DataContext"
import type { EntityType, IconName, Student } from "@/types"

export type SearchPick =
  | { kind: "student"; student: Student }
  | { kind: "entity"; type: EntityType; id: string; name: string }

export interface SearchOverlayProps {
  onClose: () => void
  onPick: (pick: SearchPick) => void
}

interface SearchResult {
  key: string
  title: string
  subtitle: string
  icon: IconName
  category: string
  pick: SearchPick
}

export function SearchOverlay({ onClose, onPick }: SearchOverlayProps) {
  const { students, sheikhs, halaqat, branches, users } = useData()
  const dataset: SearchResult[] = useMemo(
    () => [
      ...students.map<SearchResult>((st) => ({
        key: `student-${st.id}`,
        title: st.name,
        subtitle: `${st.id} · ${st.branch} · ${st.halaqa}`,
        icon: "school",
        category: "الطلاب",
        pick: { kind: "student", student: st },
      })),
      ...sheikhs.map<SearchResult>((sh) => ({
        key: `sheikh-${sh.personId}`,
        title: sh.name,
        subtitle: `شيخ · ${sh.halaqat.join("، ") || "بدون حلقات"}`,
        icon: "user",
        category: "الشيوخ",
        pick: { kind: "entity", type: "sheikhs", id: String(sh.personId), name: sh.name },
      })),
      ...halaqat.map<SearchResult>((h) => ({
        key: `halaqa-${h.id}`,
        title: h.name,
        subtitle: `${h.studentCount} طالبا · ${h.branch}`,
        icon: "book",
        category: "الحلقات",
        pick: { kind: "entity", type: "halaqat", id: String(h.id), name: h.name },
      })),
      ...branches.map<SearchResult>((b) => ({
        key: `branch-${b.id}`,
        title: b.name,
        subtitle: `${b.location || "—"} · ${b.studentCount} طالبا`,
        icon: "branch",
        category: "المقرات",
        pick: { kind: "entity", type: "branches", id: String(b.id), name: b.name },
      })),
      ...users.map<SearchResult>((u) => ({
        key: `user-${u.userId}`,
        title: u.name,
        subtitle: `${u.role} · ${u.username}`,
        icon: "userCog",
        category: "المستخدمون",
        pick: { kind: "entity", type: "users", id: String(u.userId), name: u.name },
      })),
    ],
    [students, sheikhs, halaqat, branches, users],
  )

  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filtered = (query.trim()
    ? dataset.filter((item) => `${item.title} ${item.subtitle}`.includes(query.trim()))
    : dataset
  ).slice(0, 30)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0))
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault()
      onPick(filtered[selectedIndex].pick)
      onClose()
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  return (
    <div className="search-overlay" onClick={onClose}>
      <div
        className="command-palette"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="البحث الشامل"
      >
        <div className="command-input">
          <Icon name="search" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="ابحث عن طالب، شيخ، حلقة، مقر أو مستخدم..."
          />
          <kbd>Esc</kbd>
        </div>
        <div className="command-results">
          {filtered.length ? (
            filtered.map((item, index) => (
              <div className="result-group" key={item.key}>
                {(index === 0 || filtered[index - 1].category !== item.category) && (
                  <small className="result-label">{item.category}</small>
                )}
                <button
                  className={selectedIndex === index ? "selected-command" : ""}
                  style={
                    selectedIndex === index
                      ? { background: "var(--primary-soft)" }
                      : undefined
                  }
                  onClick={() => {
                    onPick(item.pick)
                    onClose()
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="result-icon">
                    <Icon name={item.icon} />
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.subtitle}</small>
                  </span>
                  <kbd>↵</kbd>
                </button>
              </div>
            ))
          ) : (
            <EmptyState
              icon="search"
              title="لا توجد نتائج."
              detail="جرّب الاسم أو المعرّف أو اسم المقر."
            />
          )}
        </div>
        <div className="command-help">
          <span>↑↓ للتنقل</span>
          <span>↵ للفتح</span>
          <span>Esc للإغلاق</span>
        </div>
      </div>
    </div>
  )
}
