import { useState, useMemo } from "react"
import { Icon, IconButton, Button, Badge, EmptyState, LoadingState, ErrorState } from "@/components/ui"
import { emptyStudentFilters } from "@/services/constants"
import { useData } from "@/services/DataContext"
import type { Student, StudentFilters } from "@/types"

export interface StudentsViewProps {
  students: Student[]
  onProfile: (student: Student) => void
  onAdd: () => void
  onFilters: () => void
  onExport: (count: number, query: string) => void
  filters: StudentFilters
  setFilters: (filters: StudentFilters) => void
  onBulkAssign: (students: Student[]) => void
  onDelete: (student: Student) => void
}

export function StudentsView({
  students,
  onProfile,
  onAdd,
  onFilters,
  onExport,
  filters,
  setFilters,
  onBulkAssign,
  onDelete,
}: StudentsViewProps) {
  const data = useData()
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string[]>([])

  const filtered = useMemo(
    () =>
      students.filter((student) => {
        const matchesQuery =
          `${student.name} ${student.school} ${student.id}`.includes(query)
        const matchesBranch =
          !filters.branch || student.branch === filters.branch
        const matchesHalaqa =
          !filters.halaqa || student.halaqa === filters.halaqa
        const matchesSheikh =
          !filters.sheikh || student.sheikh.includes(filters.sheikh)
        const matchesLevel = !filters.level || student.level === filters.level
        const matchesSchool =
          !filters.school || student.school.includes(filters.school)
        const matchesAge =
          (!filters.minAge || student.age >= Number(filters.minAge)) &&
          (!filters.maxAge || student.age <= Number(filters.maxAge))
        return (
          matchesQuery &&
          matchesBranch &&
          matchesHalaqa &&
          matchesSheikh &&
          matchesLevel &&
          matchesSchool &&
          matchesAge
        )
      }),
    [students, query, filters],
  )

  const active = Object.entries(filters).filter(([, value]) => value)

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )

  const allSelected =
    filtered.length > 0 &&
    filtered.every((student) => selected.includes(student.id))

  return (
    <div className="page">
      <section className="page-heading">
        <div>
          <div className="page-title">الطلاب</div>
          <p>إدارة الطلاب والبحث في بياناتهم على مستوى الجمعية.</p>
        </div>
        <Button icon="plus" onClick={onAdd}>
          إضافة طالب
        </Button>
      </section>

      <div className="toolbar">
        <label className="search-field">
          <Icon name="search" />
          <input
            aria-label="بحث الطلاب"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم، المعرّف أو المدرسة..."
          />
        </label>
        <Button variant="secondary" icon="filter" onClick={onFilters}>
          تصفية{" "}
          {active.length > 0 && (
            <span className="filter-count">{active.length}</span>
          )}
        </Button>
        <Button variant="secondary" icon="download" onClick={() => onExport(filtered.length, query)}>
          تصدير
        </Button>
      </div>

      {active.length > 0 && (
        <div className="filter-chips">
          {active.map(([key, value]) => (
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
          <button
            className="clear-filters"
            onClick={() => setFilters(emptyStudentFilters)}
          >
            مسح الكل
          </button>
        </div>
      )}

      {selected.length > 0 && (
        <div className="bulk-bar">
          <strong>{selected.length} طلاب محددون</strong>
          <span>
            <Button variant="secondary" icon="download" onClick={() => onExport(filtered.length, query)}>
              تصدير
            </Button>
            <Button
              variant="secondary"
              icon="book"
              onClick={() =>
                onBulkAssign(students.filter((student) => selected.includes(student.id)))
              }
            >
              تعيين حلقة
            </Button>
            <Button variant="ghost" onClick={() => setSelected([])}>
              إلغاء التحديد
            </Button>
          </span>
        </div>
      )}

      <div className="table-shell">
        <div className="table-meta">
          <span>
            <strong>{filtered.length}</strong> طلاب وُجدوا
          </span>
          <button onClick={onFilters}>
            الأعمدة <Icon name="chevron" size={15} />
          </button>
        </div>

        {data.loading && students.length === 0 ? (
          <LoadingState />
        ) : data.errors.students ? (
          <ErrorState message={data.errors.students} onRetry={() => void data.refresh(["students"])} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="school"
            title="لا يوجد طلاب مطابقون."
            detail="جرّب تعديل البحث أو مسح الفلاتر الحالية."
            action="مسح الفلاتر"
            onAction={() => {
              setQuery("")
              setFilters(emptyStudentFilters)
            }}
          />
        ) : (
          <>
            <div className="desktop-table">
              <table>
                <thead>
                  <tr>
                    <th>
                      <input
                        aria-label="تحديد الكل"
                        type="checkbox"
                        checked={allSelected}
                        onChange={() =>
                          setSelected(
                            allSelected
                              ? []
                              : filtered.map((student) => student.id),
                          )
                        }
                      />
                    </th>
                    <th>الطالب</th>
                    <th>العمر</th>
                    <th>المستوى الدراسي</th>
                    <th>المقر والحلقة</th>
                    <th>الشيخ</th>
                    <th>تاريخ التسجيل</th>
                    <th>الحالة</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((student) => (
                    <tr key={student.id} onClick={() => onProfile(student)}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          aria-label={`تحديد ${student.name}`}
                          type="checkbox"
                          checked={selected.includes(student.id)}
                          onChange={() => toggle(student.id)}
                        />
                      </td>
                      <td>
                        <div className="person-cell">
                          <span className="avatar">{student.initials}</span>
                          <span>
                            <strong>{student.name}</strong>
                            <small>{student.id}</small>
                          </span>
                        </div>
                      </td>
                      <td>{student.age} سنة</td>
                      <td>
                        <strong>{student.level}</strong>
                        <small className="subline">{student.school}</small>
                      </td>
                      <td>
                        <strong>{student.branch}</strong>
                        <small className="subline">{student.halaqa}</small>
                      </td>
                      <td>{student.sheikh}</td>
                      <td>{student.date}</td>
                      <td>
                        <Badge
                          tone={
                            student.status === "نشط" ? "success" : "warning"
                          }
                        >
                          {student.status}
                        </Badge>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          icon="more"
                          label={`حذف ${student.name}`}
                          onClick={() => onDelete(student)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-cards">
              {filtered.map((student) => (
                <button
                  key={student.id}
                  className="student-card"
                  onClick={() => onProfile(student)}
                >
                  <span className="avatar">{student.initials}</span>
                  <div className="student-main">
                    <strong>{student.name}</strong>
                    <small>
                      {student.level} · {student.branch}
                    </small>
                    <span>
                      <Icon name="book" size={14} /> {student.halaqa}
                    </span>
                  </div>
                  <Badge
                    tone={student.status === "نشط" ? "success" : "warning"}
                  >
                    {student.status}
                  </Badge>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
