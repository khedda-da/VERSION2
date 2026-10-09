import { useMemo, useState } from "react"
import { Icon } from "@/components/ui/Icon"
import { Button } from "@/components/ui/Button"
import { IconButton } from "@/components/ui/IconButton"
import { LoadingState } from "@/components/ui/StateViews"
import { api, errorMessage } from "@/services/api"
import { useAsync } from "@/services/useAsync"
import { useData } from "@/services/DataContext"
import type { DataKey } from "@/services/DataContext"

/** What the dialog is assigning, and to whom. */
export type AssignTarget =
  /** enroll one student (person) into halaqat */
  | { mode: "student-to-halaqat"; personId: number; name: string }
  /** enroll several students into one halaqa */
  | { mode: "students-bulk"; personIds: number[] }
  /** assign a sheikh to halaqat */
  | { mode: "sheikh-to-halaqat"; personId: number; name: string }
  /** enroll students into a given halaqa */
  | { mode: "students-to-halaqa"; halaqaId: number; name: string }
  /** give a role to people */
  | { mode: "role-to-people"; roleId: number; name: string; branchScoped: boolean }
  /** reset a user's password */
  | { mode: "reset-password"; userId: number; name: string }

interface AssignmentDialogProps {
  target: AssignTarget
  onClose: () => void
  onDone: (message: string) => void
}

const TITLES: Record<AssignTarget["mode"], string> = {
  "student-to-halaqat": "تعيين الطالب إلى حلقة",
  "students-bulk": "تعيين الطلاب المحددين إلى حلقة",
  "sheikh-to-halaqat": "تعيين الشيخ في حلقات",
  "students-to-halaqa": "إضافة طلاب إلى الحلقة",
  "role-to-people": "تعيين مستخدمين لهذا الدور",
  "reset-password": "إعادة ضبط كلمة المرور",
}

interface Option {
  key: number
  title: string
  detail: string
}

export function AssignmentDialog({ target, onClose, onDone }: AssignmentDialogProps) {
  const { halaqat, students, branches, refresh } = useData()
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<number[]>([])
  const [branchId, setBranchId] = useState<number | "">("")
  const [password, setPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const needsPersons = target.mode === "role-to-people"
  const persons = useAsync(() => (needsPersons ? api.getPersons() : Promise.resolve([])), [needsPersons])

  const single = target.mode === "students-bulk" // choose exactly one halaqa

  const options: Option[] = useMemo(() => {
    switch (target.mode) {
      case "student-to-halaqat":
      case "students-bulk":
      case "sheikh-to-halaqat":
        return halaqat.map((h) => ({
          key: h.id,
          title: `${h.name} — ${h.branch}`,
          detail: `${h.studentCount} طالبا`,
        }))
      case "students-to-halaqa":
        return students
          .filter((s) => s.personId)
          .map((s) => ({
            key: s.personId as number,
            title: s.name,
            detail: `${s.level} · ${s.branch}`,
          }))
      case "role-to-people":
        return (persons.data ?? []).map((p) => ({
          key: p.id,
          title: p.full_name,
          detail: p.phone || p.email || "",
        }))
      default:
        return []
    }
  }, [target.mode, halaqat, students, persons.data])

  const shown = options.filter((o) => `${o.title} ${o.detail}`.includes(query))

  const toggle = (key: number) =>
    setSelected((current) => {
      if (single) return [key]
      return current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    })

  const submit = async () => {
    setError("")
    if (target.mode === "reset-password") {
      if (password.length < 6) return setError("كلمة المرور 6 أحرف على الأقل.")
    } else if (selected.length === 0) {
      return setError("حدّد عنصرا واحدا على الأقل.")
    }
    if (target.mode === "role-to-people" && target.branchScoped && !branchId)
      return setError("هذا الدور خاص بمقر، اختر المقر.")

    setSaving(true)
    const failures: string[] = []
    const keys: DataKey[] = []
    try {
      switch (target.mode) {
        case "student-to-halaqat":
          for (const id of selected) await api.enrollStudent(id, target.personId).catch((e) => failures.push(errorMessage(e)))
          keys.push("students", "halaqat", "notifications")
          break
        case "students-bulk":
          for (const personId of target.personIds)
            await api.enrollStudent(selected[0], personId).catch((e) => failures.push(errorMessage(e)))
          keys.push("students", "halaqat", "notifications")
          break
        case "sheikh-to-halaqat":
          for (const id of selected) await api.assignTeacher(id, target.personId).catch((e) => failures.push(errorMessage(e)))
          keys.push("sheikhs", "halaqat")
          break
        case "students-to-halaqa":
          for (const personId of selected)
            await api.enrollStudent(target.halaqaId, personId).catch((e) => failures.push(errorMessage(e)))
          keys.push("students", "halaqat", "notifications")
          break
        case "role-to-people":
          for (const personId of selected)
            await api
              .assignRole(personId, target.roleId, target.branchScoped ? Number(branchId) : null)
              .catch((e) => failures.push(errorMessage(e)))
          keys.push("roles", "users")
          break
        case "reset-password":
          await api.updateUser(target.userId, { password })
          break
      }
    } catch (err) {
      setSaving(false)
      return setError(errorMessage(err))
    }

    if (keys.length) await refresh(keys)
    if (failures.length && failures.length >= Math.max(selected.length, 1)) {
      setSaving(false)
      return setError(failures[0])
    }
    onDone(
      failures.length
        ? `تم الحفظ جزئيا: ${failures.length} عملية لم تنجح (${failures[0]}).`
        : target.mode === "reset-password"
          ? "تم تغيير كلمة المرور بنجاح."
          : "تم تحديث التعيينات بنجاح.",
    )
    onClose()
  }

  return (
    <div className="modal-layer">
      <div
        className="dialog assignment-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={TITLES[target.mode]}
      >
        <div className="form-modal-head">
          <div>
            <strong>{TITLES[target.mode]}</strong>
            <small>
              {target.mode === "reset-password"
                ? `الحساب: ${target.name}`
                : "ابحث وحدد عنصرا أو أكثر ضمن نطاقك."}
            </small>
          </div>
          <IconButton icon="close" label="إغلاق" onClick={onClose} />
        </div>
        <div className="dialog-content">
          {target.mode === "reset-password" ? (
            <label>
              كلمة المرور الجديدة
              <input
                type="password"
                dir="ltr"
                autoFocus
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>
          ) : (
            <>
              <label className="search-field">
                <Icon name="search" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث بالاسم..."
                />
              </label>
              {target.mode === "role-to-people" && target.branchScoped && (
                <label>
                  المقر
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">اختر المقر</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {persons.loading ? (
                <LoadingState rows={3} />
              ) : (
                <div className="multi-select">
                  {shown.length === 0 && <small>لا توجد عناصر مطابقة.</small>}
                  {shown.map((item) => (
                    <label key={item.key}>
                      <input
                        type={single ? "radio" : "checkbox"}
                        name="assign-choice"
                        checked={selected.includes(item.key)}
                        onChange={() => toggle(item.key)}
                      />
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
          {error && (
            <div className="info-alert" role="alert">
              <Icon name="warning" />
              <span>
                <small>{error}</small>
              </span>
            </div>
          )}
        </div>
        <div className="dialog-footer">
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "جارٍ الحفظ..." : target.mode === "reset-password" ? "حفظ كلمة المرور" : "حفظ التعيينات"}
          </Button>
        </div>
      </div>
    </div>
  )
}
