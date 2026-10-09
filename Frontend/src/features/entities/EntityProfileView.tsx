import { useState } from "react"
import { Icon } from "@/components/ui/Icon"
import { Button } from "@/components/ui/Button"
import { IconButton } from "@/components/ui/IconButton"
import { Badge } from "@/components/ui/Badge"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState, LoadingState } from "@/components/ui/StateViews"
import { api, downloadCsv } from "@/services/api"
import { useAsync } from "@/services/useAsync"
import { useData } from "@/services/DataContext"
import { entityCapabilities, entityMeta, profileTabs } from "@/services/constants"
import {
  AUDIT_TABLE,
  auditRecordId,
  loadEntityDetail,
  type EntityDetail,
} from "./entityModel"
import { academicLevel } from "@/utils/format"
import type { EntityType } from "@/types/navigation"
import type { HalaqaRecord } from "@/types/halaqa"
import type { Student } from "@/types/student"
import type { ExportRequest } from "./exportTypes"

// ── sub-components ──────────────────────────────────────────────────────────

function RelatedHalaqat({
  records,
  onOpen,
  onAssign,
}: {
  records: HalaqaRecord[]
  onOpen: (id: string, name: string) => void
  onAssign: () => void
}) {
  if (!records.length)
    return (
      <EmptyState
        icon="book"
        title="لا توجد حلقات مرتبطة حالياً."
        detail="يمكن إضافة ارتباط جديد ضمن نطاق صلاحياتك."
        action="تعيين حلقة"
        onAction={onAssign}
      />
    )
  return (
    <div className="relation-list">
      {records.map((record) => (
        <button onClick={() => onOpen(String(record.id), record.name)} key={record.id}>
          <span className="relation-icon">
            <Icon name="book" />
          </span>
          <span>
            <strong>{record.name}</strong>
            <small>
              {record.level} · {record.branch} · {record.students} طالبا
            </small>
          </span>
          <Icon name="arrow" />
        </button>
      ))}
    </div>
  )
}

interface PersonStudent {
  person_id: number
  full_name: string
  school_name?: string
  academic_level?: string
}

function RelatedStudents({
  students,
  onAssign,
  onOpenStudent,
  canAdd,
}: {
  students: PersonStudent[]
  onAssign: () => void
  onOpenStudent: (student: Student) => void
  canAdd: boolean
}) {
  const [query, setQuery] = useState("")
  const { students: allStudents } = useData()
  const matching = students.filter((s) => s.full_name.includes(query))

  return (
    <div>
      <div className="inline-toolbar">
        <label className="search-field">
          <Icon name="search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن طالب..."
          />
        </label>
        {canAdd && (
          <Button variant="secondary" icon="plus" onClick={onAssign}>
            إضافة طالب
          </Button>
        )}
      </div>
      {matching.length ? (
        <div className="compact-list">
          {matching.map((student) => {
            const full = allStudents.find((s) => s.personId === student.person_id)
            const body = (
              <>
                <span className="avatar">{student.full_name.slice(0, 2)}</span>
                <span>
                  <strong>{student.full_name}</strong>
                  <small>
                    {academicLevel(student.academic_level)} · {student.school_name || "—"}
                  </small>
                </span>
                <Badge tone="success">نشط</Badge>
              </>
            )
            return full ? (
              <button className="compact-row" key={student.person_id} onClick={() => onOpenStudent(full)}>
                {body}
              </button>
            ) : (
              <div key={student.person_id}>{body}</div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon="school"
          title="لا يوجد طلاب مرتبطون حالياً."
          detail="لا توجد سجلات تطابق هذه العلاقة أو البحث الحالي."
          action={query ? "مسح البحث" : canAdd ? "إضافة طالب" : undefined}
          onAction={() => (query ? setQuery("") : onAssign())}
        />
      )}
    </div>
  )
}

function EntityActivity({ detail }: { detail: EntityDetail }) {
  const recordId = auditRecordId(detail)
  const table = AUDIT_TABLE[detail.type]
  const { data, loading, error } = useAsync(() => api.getAudit(300), [table, recordId])

  if (loading) return <LoadingState rows={2} />
  if (error)
    return (
      <div className="compact-list">
        <div>
          <span className="avatar">
            <Icon name="shield" size={18} />
          </span>
          <span>
            <strong>سجل النشاط غير متاح</strong>
            <small>{error}</small>
          </span>
        </div>
      </div>
    )

  const entries = (data ?? []).filter((e) => e.tableName === table && e.recordId === recordId)
  if (!entries.length)
    return (
      <div className="compact-list">
        <div>
          <span className="avatar">
            <Icon name="shield" size={18} />
          </span>
          <span>
            <strong>لا يوجد نشاط مسجّل حديثا</strong>
            <small>سيظهر سجل النشاط هنا عند حدوث تغييرات.</small>
          </span>
        </div>
      </div>
    )

  return (
    <div className="compact-list">
      {entries.map((entry) => (
        <div key={entry.id}>
          <span className="avatar">{entry.user.slice(0, 2)}</span>
          <span>
            <strong>
              {entry.user} · {entry.actionLabel} {entry.tableLabel}
            </strong>
            <small>{entry.timestamp}</small>
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Tab content ──────────────────────────────────────────────────────────────

interface TabProps {
  detail: EntityDetail
  tab: string
  onAssign: () => void
  onOpenRelated: (type: EntityType, id: string, name: string) => void
  onOpenStudent: (student: Student) => void
  canAssign: boolean
}

function ProfileTabContent({
  detail,
  tab,
  onAssign,
  onOpenRelated,
  onOpenStudent,
  canAssign,
}: TabProps) {
  const { sheikhs } = useData()

  if (tab.includes("النشاط")) return <EntityActivity detail={detail} />

  if (detail.type === "sheikhs") {
    const d = detail.data
    if (tab === "الحلقات")
      return (
        <RelatedHalaqat
          records={d.halaqaDetails.map((h) => ({
            id: h.id,
            name: h.name,
            level: h.level || "—",
            branch: h.branch_name,
            sheikh: d.name,
            students: Number(h.student_count),
          }))}
          onOpen={(id, name) => onOpenRelated("halaqat", id, name)}
          onAssign={onAssign}
        />
      )
    if (tab === "الطلاب")
      return (
        <RelatedStudents
          students={d.students}
          onAssign={onAssign}
          onOpenStudent={onOpenStudent}
          canAdd={false}
        />
      )
  }

  if (detail.type === "halaqat") {
    const d = detail.data
    if (tab === "الطلاب")
      return (
        <RelatedStudents
          students={d.students}
          onAssign={onAssign}
          onOpenStudent={onOpenStudent}
          canAdd={canAssign}
        />
      )
    if (tab === "الشيوخ")
      return d.teachers.length ? (
        <div className="compact-list">
          {d.teachers.map((t) => (
            <button
              className="compact-row"
              key={t.id}
              onClick={() => onOpenRelated("sheikhs", String(t.id), t.full_name)}
            >
              <span className="avatar">
                <Icon name="user" size={18} />
              </span>
              <span>
                <strong>{t.full_name}</strong>
                <small>{t.phone || t.email || "—"}</small>
              </span>
              <Icon name="arrow" />
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="user"
          title="لا يوجد شيخ معيّن لهذه الحلقة."
          detail="يمكن تعيين شيخ من نموذج تعديل الحلقة."
        />
      )
    if (tab === "إحصائيات")
      return (
        <div className="details-grid">
          <div>
            <small>الطلاب</small>
            <strong>{d.studentCount}</strong>
          </div>
          <div>
            <small>الشيوخ</small>
            <strong>{d.teachers.length}</strong>
          </div>
          <div>
            <small>المستوى</small>
            <strong>{d.level || "—"}</strong>
          </div>
          <div>
            <small>المقر</small>
            <strong>{d.branch}</strong>
          </div>
        </div>
      )
  }

  if (detail.type === "branches") {
    const d = detail.data
    if (tab === "الحلقات")
      return (
        <RelatedHalaqat
          records={d.halaqat.map((h) => ({
            id: h.id,
            name: h.name,
            level: h.level || "—",
            branch: d.name,
            sheikh: h.teacher_name || "—",
            students: Number(h.student_count),
          }))}
          onOpen={(id, name) => onOpenRelated("halaqat", id, name)}
          onAssign={onAssign}
        />
      )
    if (tab === "المسؤولون")
      return d.adminDetails.length ? (
        <div className="compact-list">
          {d.adminDetails.map((admin) => {
            const adminName = admin.full_name || admin.name || "—"
            return (
              <div key={admin.id}>
                <span className="avatar">{adminName.slice(0, 2)}</span>
                <span>
                  <strong>{adminName}</strong>
                  <small>مسؤول مقر · {admin.phone || admin.email || "—"}</small>
                </span>
                <Badge tone="success">نشط</Badge>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon="user"
          title="لا يوجد مسؤولون لهذا المقر."
          detail="يمكن تعيين حتى ثلاثة مسؤولين من نموذج تعديل المقر."
        />
      )
    if (tab === "الشيوخ") {
      const names = [...new Set(d.halaqat.map((h) => h.teacher_name).filter(Boolean))] as string[]
      return names.length ? (
        <div className="compact-list">
          {names.map((name) => {
            const sheikh = sheikhs.find((s) => s.name === name)
            const body = (
              <>
                <span className="avatar">
                  <Icon name="user" size={18} />
                </span>
                <span>
                  <strong>{name}</strong>
                  <small>
                    {d.halaqat.filter((h) => h.teacher_name === name).length} حلقات مرتبطة
                  </small>
                </span>
                {sheikh && <Icon name="arrow" />}
              </>
            )
            return sheikh ? (
              <button
                className="compact-row"
                key={name}
                onClick={() => onOpenRelated("sheikhs", String(sheikh.personId), name)}
              >
                {body}
              </button>
            ) : (
              <div key={name}>{body}</div>
            )
          })}
        </div>
      ) : (
        <EmptyState icon="user" title="لا يوجد شيوخ في هذا المقر." detail="لم تُسند حلقات بعد." />
      )
    }
  }

  if (detail.type === "roles") {
    const d = detail.data
    if (tab === "الصلاحيات")
      return (
        <>
          <div className="details-grid">
            <div>
              <small>النطاق</small>
              <strong>{d.scope === "branch" ? "خاص بالمقر" : "مركزي"}</strong>
            </div>
            <div>
              <small>المستخدمون</small>
              <strong>{d.userCount}</strong>
            </div>
            <div>
              <small>الحالة</small>
              <strong>{d.status}</strong>
            </div>
          </div>
          <div className="info-alert">
            <Icon name="shield" />
            <span>
              <strong>الصلاحيات تُحدَّد بحسب نطاق الدور</strong>
              <small>
                الدور المركزي يرى ويدير كل المقرات، ودور المقر مقيَّد بمقر واحد.
              </small>
            </span>
          </div>
        </>
      )
    if (tab === "المستخدمون")
      return d.assignedPersons.length ? (
        <div className="compact-list">
          {d.assignedPersons.map((p) => (
            <div key={`${p.id}-${p.branch_name ?? ""}`}>
              <span className="avatar">{p.full_name.slice(0, 2)}</span>
              <span>
                <strong>{p.full_name}</strong>
                <small>{p.branch_name || "كل المقرات"}</small>
              </span>
              <Badge tone="success">نشط</Badge>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="people"
          title="لا يوجد مستخدمون بهذا الدور."
          detail="استخدم زر «تعيين مستخدم» لإضافة شخص."
          action={canAssign ? "تعيين مستخدم" : undefined}
          onAction={onAssign}
        />
      )
  }

  if (detail.type === "users" && tab === "الأدوار") {
    const d = detail.data
    return d.roles.length ? (
      <div className="compact-list">
        {d.roles.map((r) => (
          <div key={`${r.id}-${r.branch_name ?? ""}`}>
            <span className="avatar">
              <Icon name="shield" size={18} />
            </span>
            <span>
              <strong>{r.name}</strong>
              <small>
                {r.scope === "branch" ? "خاص بالمقر" : "مركزي"} · {r.branch_name || "كل المقرات"}
              </small>
            </span>
          </div>
        ))}
      </div>
    ) : (
      <EmptyState
        icon="shield"
        title="لا توجد أدوار لهذا الحساب."
        detail="يمكن تعيين دور من نموذج تعديل المستخدم."
      />
    )
  }

  return null
}

// ── Summary / export helpers ────────────────────────────────────────────────

const SINGULAR: Record<EntityType, string> = {
  sheikhs: "شيخ",
  halaqat: "حلقة",
  branches: "مقر",
  roles: "دور",
  users: "مستخدم",
}

const PRIMARY_ASSIGN_LABEL: Record<EntityType, string> = {
  halaqat: "إضافة طالب",
  sheikhs: "تعيين حلقة",
  branches: "إضافة حلقة",
  roles: "تعيين مستخدم",
  users: "إعادة ضبط كلمة المرور",
}

function describe(detail: EntityDetail): {
  subtitle: string
  status: string
  inactive: boolean
  summary: [string, string][]
  csv: [string[], (string | number)[]]
} {
  switch (detail.type) {
    case "sheikhs": {
      const d = detail.data
      return {
        subtitle: `${d.halaqaDetails.length} حلقات · ${d.studentCount} طالبا`,
        status: d.status,
        inactive: d.status === "غير نشط",
        summary: [
          ["الهاتف", d.phone || "—"],
          ["البريد", d.email || "—"],
          ["المقرات", d.branches.join("، ") || "—"],
        ],
        csv: [
          ["الاسم", "الهاتف", "البريد", "الحلقات", "المقرات", "عدد الطلاب"],
          [d.name, d.phone, d.email, d.halaqat.join("، "), d.branches.join("، "), d.studentCount],
        ],
      }
    }
    case "halaqat": {
      const d = detail.data
      return {
        subtitle: `${d.level} · ${d.branch}`,
        status: d.status,
        inactive: !d.isActive,
        summary: [
          ["المقر", d.branch],
          ["المستوى", d.level],
          ["الشيخ", d.sheikh],
        ],
        csv: [
          ["الحلقة", "المقر", "المستوى", "الشيخ", "عدد الطلاب", "الحالة"],
          [d.name, d.branch, d.level, d.sheikh, d.studentCount, d.status],
        ],
      }
    }
    case "branches": {
      const d = detail.data
      return {
        subtitle: `${d.location || "—"} · ${d.studentCount} طالبا`,
        status: d.status,
        inactive: !d.isActive,
        summary: [
          ["الموقع", d.location || "—"],
          ["الهاتف", d.phone || "—"],
          ["المسؤولون", `${d.adminCount} من 3`],
        ],
        csv: [
          ["المقر", "الموقع", "الهاتف", "عدد الطلاب", "عدد الحلقات", "المسؤولون", "الحالة"],
          [d.name, d.location, d.phone || "", d.studentCount, d.halaqaCount, d.admins.join("، "), d.status],
        ],
      }
    }
    case "roles": {
      const d = detail.data
      const scope = d.scope === "branch" ? "خاص بالمقر" : "مركزي"
      return {
        subtitle: `${scope} · ${d.userCount} مستخدمين`,
        status: d.status,
        inactive: d.status === "غير نشط",
        summary: [
          ["النطاق", scope],
          ["المستخدمون", String(d.userCount)],
        ],
        csv: [
          ["الدور", "النطاق", "عدد المستخدمين", "الحالة"],
          [d.name, scope, d.userCount, d.status],
        ],
      }
    }
    case "users": {
      const d = detail.data
      return {
        subtitle: `${d.status === "نشط" ? "حساب نشط" : "حساب غير نشط"} · آخر دخول ${
          d.lastLogin ? String(d.lastLogin).slice(0, 16) : "غير متاح"
        }`,
        status: d.status,
        inactive: !d.isActive,
        summary: [
          ["اسم المستخدم", d.username],
          ["البريد", d.email || "—"],
          ["الهاتف", d.phone || "—"],
        ],
        csv: [
          ["الاسم", "اسم المستخدم", "البريد", "الهاتف", "الأدوار", "الحالة"],
          [d.name, d.username, d.email, d.phone, d.roles.map((r) => r.name).join("، "), d.status],
        ],
      }
    }
  }
}

// ── EntityProfileView ────────────────────────────────────────────────────────

interface EntityProfileViewProps {
  type: EntityType
  id: string
  name: string
  /** bump to force a re-fetch after an edit */
  version: number
  onBack: () => void
  onEdit: (detail: EntityDetail) => void
  onExport: (request: ExportRequest) => void
  onAssign: (detail: EntityDetail) => void
  onDelete: (detail: EntityDetail) => void
  onOpenRelated: (type: EntityType, id: string, name: string) => void
  onOpenStudent: (student: Student) => void
}

export function EntityProfileView({
  type,
  id,
  name,
  version,
  onBack,
  onEdit,
  onExport,
  onAssign,
  onDelete,
  onOpenRelated,
  onOpenStudent,
}: EntityProfileViewProps) {
  const content = entityMeta[type]
  const caps = entityCapabilities[type]
  const [tab, setTab] = useState(profileTabs[type][0])
  const { data: detail, loading, error, reload } = useAsync(
    () => loadEntityDetail(type, id),
    [type, id, version],
  )

  const back = (
    <button className="back-link" onClick={onBack}>
      <Icon name="arrow" /> العودة إلى {content.title}
    </button>
  )

  if (loading && !detail)
    return (
      <div className="page profile-page">
        {back}
        <LoadingState />
      </div>
    )

  if (error || !detail)
    return (
      <div className="page profile-page">
        {back}
        <ErrorState message={error || "لم يتم العثور على السجل."} onRetry={reload} />
      </div>
    )

  const info = describe(detail)
  const displayName = detail.data.name || name
  const canAssign = true

  const exportProfile = () =>
    onExport({
      title: displayName,
      count: 1,
      formats: ["csv"],
      run: async () => downloadCsv(`${type}-${id}.csv`, info.csv[0], [info.csv[1]]),
    })

  return (
    <div className="page profile-page">
      {back}

      <section className="profile-header">
        <div className="profile-identity">
          <span className="avatar profile-avatar">
            <Icon name={content.icon} />
          </span>
          <div>
            <div className="title-with-badge">
              <div className="page-title">{displayName}</div>
              <Badge tone="info">{SINGULAR[type]}</Badge>
            </div>
            <p>{info.subtitle}</p>
          </div>
        </div>
        <div className="profile-actions">
          <Button variant="secondary" icon="download" onClick={exportProfile}>
            تصدير
          </Button>
          <Button variant="secondary" icon="plus" onClick={() => onAssign(detail)}>
            {PRIMARY_ASSIGN_LABEL[type]}
          </Button>
          {caps.edit && (
            <Button icon="edit" onClick={() => onEdit(detail)}>
              تعديل
            </Button>
          )}
          {caps.remove && (
            <IconButton icon="more" label="حذف" onClick={() => onDelete(detail)} />
          )}
        </div>
      </section>

      <div className="profile-tabs">
        {profileTabs[type].map((item) => (
          <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>
            {item}
          </button>
        ))}
      </div>

      <div className="profile-layout">
        <main>
          <section className="detail-section">
            <div className="section-title">
              <strong>{tab}</strong>
              {caps.edit && !tab.includes("النشاط") && !tab.includes("إحصائيات") && type !== "roles" && (
                <button onClick={() => onEdit(detail)}>تعديل</button>
              )}
            </div>
            <ProfileTabContent
              detail={detail}
              tab={tab}
              onAssign={() => onAssign(detail)}
              onOpenRelated={onOpenRelated}
              onOpenStudent={onOpenStudent}
              canAssign={canAssign}
            />
          </section>
        </main>
        <aside className="profile-aside">
          <div className="aside-block">
            <strong>ملخص</strong>
            <div>
              <span>الحالة</span>
              <Badge tone={info.inactive ? "warning" : "success"}>{info.status}</Badge>
            </div>
            {info.summary.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <b>{value}</b>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
