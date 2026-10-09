import { Icon, IconButton, Button, Badge } from "@/components/ui"
import { api } from "@/services/api"
import { useAsync } from "@/services/useAsync"
import type { Student, Screen, EntityType } from "@/types"

export interface StudentProfileProps {
  student?: Student
  goBack: () => void
  navigate: (s: Screen) => void
  onOpenEntity: (type: EntityType, id: string, name: string) => void
  onEdit: () => void
  onExport: () => void
  onAssign: () => void
  onDelete: () => void
}

export function StudentProfile({
  student,
  goBack,
  navigate,
  onOpenEntity,
  onEdit,
  onExport,
  onAssign,
  onDelete,
}: StudentProfileProps) {
  const audit = useAsync(
    () => (student?.studentId ? api.getAudit(300) : Promise.resolve([])),
    [student?.studentId],
  )
  const recent = (audit.data ?? [])
    .filter((e) => e.tableName === "students" && e.recordId === student?.studentId)
    .slice(0, 3)

  if (!student) {
    return (
      <div className="page profile-page">
        <button className="back-link" onClick={goBack}>
          <Icon name="arrow" /> العودة إلى الطلاب
        </button>
        <div className="empty-state">
          <strong>لم يتم العثور على الطالب</strong>
          <p>قد يكون الطالب قد تم حذفه أو أن المعرّف غير صحيح.</p>
          <Button variant="secondary" onClick={goBack}>
            العودة للقائمة
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="page profile-page">
      <button className="back-link" onClick={goBack}>
        <Icon name="arrow" /> العودة إلى الطلاب
      </button>
      <section className="profile-header">
        <div className="profile-identity">
          <span className="avatar profile-avatar">{student.initials}</span>
          <div>
            <div className="title-with-badge">
              <div className="page-title">{student.name}</div>
              <Badge tone="info">طالب</Badge>
            </div>
            <p>
              <span dir="ltr">{student.id}</span> · {student.age} سنة · مسجل منذ {student.date}
            </p>
            <div className="scope-line">
              <Icon name="branch" size={16} /> {student.branch}
            </div>
          </div>
        </div>
        <div className="profile-actions">
          <Button variant="secondary" icon="download" onClick={onExport}>
            تصدير
          </Button>
          <Button icon="edit" onClick={onEdit}>
            تعديل
          </Button>
          <IconButton icon="more" label="حذف الطالب" onClick={onDelete} />
        </div>
      </section>
      <div className="profile-layout">
        <main>
          <section className="detail-section">
            <div className="section-title">
              <strong>المعلومات الشخصية</strong>
              <button onClick={onEdit}>تعديل</button>
            </div>
            <div className="details-grid">
              <div>
                <small>تاريخ الميلاد</small>
                <strong>{student.birthDate || "—"}</strong>
              </div>
              <div>
                <small>الجنس</small>
                <strong>{student.gender || "—"}</strong>
              </div>
              <div>
                <small>الهاتف</small>
                <strong dir="ltr">{student.phone || "—"}</strong>
              </div>
              <div>
                <small>البريد الإلكتروني</small>
                <strong dir="ltr">{student.email || "—"}</strong>
              </div>
            </div>
          </section>
          <section className="detail-section">
            <div className="section-title">
              <strong>المعلومات الدراسية</strong>
              <button onClick={onEdit}>تعديل</button>
            </div>
            <div className="details-grid">
              <div>
                <small>المؤسسة التعليمية</small>
                <strong>{student.school}</strong>
              </div>
              <div>
                <small>المستوى الدراسي</small>
                <strong>{student.level}</strong>
              </div>
            </div>
          </section>
          <section className="detail-section">
            <div className="section-title">
              <strong>الارتباطات القرآنية</strong>
              <Button variant="secondary" icon="plus" onClick={onAssign}>
                إضافة إلى حلقة
              </Button>
            </div>
            <div className="relationship-flow">
              <button onClick={() => undefined} disabled>
                <span className="relation-icon">
                  <Icon name="school" />
                </span>
                <small>الطالب</small>
                <strong>{student.name.split(" ")[0]}</strong>
              </button>
              <Icon name="chevron" />
              <button
                disabled={!student.halaqaId}
                onClick={() => student.halaqaId && onOpenEntity("halaqat", String(student.halaqaId), student.halaqa)}
              >
                <span className="relation-icon">
                  <Icon name="book" />
                </span>
                <small>الحلقة</small>
                <strong>{student.halaqa}</strong>
              </button>
              <Icon name="chevron" />
              <button
                disabled={!student.sheikhId}
                onClick={() => student.sheikhId && onOpenEntity("sheikhs", String(student.sheikhId), student.sheikh)}
              >
                <span className="relation-icon">
                  <Icon name="user" />
                </span>
                <small>الشيخ</small>
                <strong>{student.sheikh}</strong>
              </button>
              <Icon name="chevron" />
              <button
                disabled={!student.branchId}
                onClick={() => student.branchId && onOpenEntity("branches", String(student.branchId), student.branch)}
              >
                <span className="relation-icon">
                  <Icon name="branch" />
                </span>
                <small>المقر</small>
                <strong>{student.branch}</strong>
              </button>
            </div>
          </section>
        </main>
        <aside className="profile-aside">
          <div className="aside-block">
            <strong>معلومات سريعة</strong>
            <div>
              <span>الحالة</span>
              <Badge tone={student.status === "نشط" ? "success" : "warning"}>
                {student.status}
              </Badge>
            </div>
            <div>
              <span>تاريخ التسجيل</span>
              <b>{student.date}</b>
            </div>
            <div>
              <span>عدد الحلقات</span>
              <b>{student.halaqaId ? 1 : 0}</b>
            </div>
          </div>
          <div className="aside-block">
            <strong>آخر نشاط</strong>
            {recent.length === 0 && (
              <div className="mini-activity">
                <i />
                <span>
                  <b>لا يوجد نشاط مسجّل</b>
                  <small>{audit.error ? "سجل النشاط متاح للمدير المركزي" : "لم تُسجَّل تغييرات بعد"}</small>
                </span>
              </div>
            )}
            {recent.map((entry) => (
              <div className="mini-activity" key={entry.id}>
                <i />
                <span>
                  <b>{entry.actionLabel} {entry.tableLabel}</b>
                  <small>{entry.timestamp} · بواسطة {entry.user}</small>
                </span>
              </div>
            ))}
            <button
              className="text-action"
              onClick={() => navigate("activity")}
            >
              عرض السجل الكامل
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
