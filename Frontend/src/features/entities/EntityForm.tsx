import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import { Icon } from "@/components/ui/Icon"
import { Button } from "@/components/ui/Button"
import { IconButton } from "@/components/ui/IconButton"
import { ConfirmDialog } from "./ConfirmDialog"
import { api, errorMessage } from "@/services/api"
import { useAsync } from "@/services/useAsync"
import { useAuth } from "@/services/AuthContext"
import { useData } from "@/services/DataContext"
import type { DataKey } from "@/services/DataContext"
import { LEVELS } from "@/services/constants"
import { toIsoDate } from "@/utils/format"
import type { FormKind } from "@/types/navigation"
import type { Student } from "@/types/student"
import type { EntityDetail } from "./entityModel"

// ── Public types ─────────────────────────────────────────────────────────────

/** What a successful save hands back so the app can navigate to the new record. */
export interface FormResult {
  kind: FormKind
  id: string
  name: string
  student?: Student
}

export type FormInitial = Student | EntityDetail

interface EntityFormProps {
  kind: FormKind
  mode?: "add" | "edit"
  /** The record being edited (student or entity detail) */
  initial?: FormInitial
  /** Pre-select a branch when creating (e.g. "add halaqa" from a branch page) */
  presetBranchId?: number
  onClose: () => void
  onSuccess: (message: string, result: FormResult) => void
}

const FORM_LABELS: Record<FormKind, string> = {
  student: "طالب",
  sheikh: "شيخ",
  halaqa: "حلقة",
  branch: "مقر",
  role: "دور",
  user: "حساب مستخدم",
}

const REFRESH_KEYS: Record<FormKind, DataKey[]> = {
  student: ["students", "halaqat", "branches", "sheikhs", "notifications"],
  sheikh: ["sheikhs", "halaqat"],
  halaqa: ["halaqat", "sheikhs", "branches"],
  branch: ["branches"],
  role: ["roles"],
  user: ["users", "roles"],
}

const today = () => new Date().toISOString().slice(0, 10)

// ── Small building blocks ────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  full,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  full?: boolean
  children: ReactNode
}) {
  return (
    <label className={full ? "full" : undefined}>
      {label} {required && <em>*</em>}
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

interface ShellProps {
  title: string
  subtitle: string
  dirty: boolean
  saving: boolean
  error: string
  onClose: () => void
  steps?: { label: string }[]
  step?: number
  onBack?: () => void
  onNext?: () => void
  onSave: () => void
  saveLabel: string
  children: ReactNode
  markDirty: () => void
}

/** Modal chrome shared by every form: header, optional stepper, footer, discard-confirm. */
function FormShell({
  title,
  subtitle,
  dirty,
  saving,
  error,
  onClose,
  steps,
  step = 1,
  onBack,
  onNext,
  onSave,
  saveLabel,
  children,
  markDirty,
}: ShellProps) {
  const [confirmClose, setConfirmClose] = useState(false)
  const close = () => (dirty && !saving ? setConfirmClose(true) : onClose())
  const isLastStep = !steps || step >= steps.length

  return (
    <div className="modal-layer">
      <div className="form-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="form-modal-head">
          <div>
            <strong>{title}</strong>
            <small>{subtitle}</small>
          </div>
          <IconButton icon="close" label="إغلاق" onClick={close} />
        </div>

        {steps && steps.length > 1 && (
          <div className="stepper">
            {steps.map((item, index) => (
              <div className={step >= index + 1 ? "active" : ""} key={item.label}>
                <span>{step > index + 1 ? <Icon name="check" size={16} /> : index + 1}</span>
                <small>{item.label}</small>
              </div>
            ))}
          </div>
        )}

        <div className="form-content" onChange={markDirty}>
          {children}
          {error && (
            <div className="info-alert" role="alert">
              <Icon name="warning" />
              <span>
                <strong>تعذر حفظ البيانات</strong>
                <small>{error}</small>
              </span>
            </div>
          )}
        </div>

        <div className="form-footer">
          <Button variant="ghost" onClick={close}>
            إلغاء
          </Button>
          <div>
            {steps && step > 1 && (
              <Button variant="secondary" onClick={onBack} disabled={saving}>
                السابق
              </Button>
            )}
            {isLastStep ? (
              <Button onClick={onSave} disabled={saving}>
                {saving ? "جارٍ الحفظ..." : saveLabel}
              </Button>
            ) : (
              <Button onClick={onNext}>
                التالي <Icon name="arrow" size={17} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {confirmClose && (
        <ConfirmDialog
          title="تغييرات غير محفوظة"
          detail="لديك تغييرات لم تُحفظ. هل تريد تجاهلها؟"
          confirmLabel="تجاهل التغييرات"
          onCancel={() => setConfirmClose(false)}
          onConfirm={onClose}
        />
      )}
    </div>
  )
}

/** Shared save plumbing: saving flag, server error, data refresh. */
function useSaver(kind: FormKind, onSuccess: EntityFormProps["onSuccess"]) {
  const { refresh } = useData()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [dirty, setDirty] = useState(false)

  const run = async (action: () => Promise<{ message: string; result: FormResult }>) => {
    if (saving) return
    setSaving(true)
    setError("")
    try {
      const { message, result } = await action()
      await refresh(REFRESH_KEYS[kind])
      onSuccess(message, result)
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return { saving, error, setError, dirty, markDirty: () => setDirty(true), run }
}

const hasContact = (phone: string, email: string) => Boolean(phone.trim() || email.trim())
const validEmail = (email: string) => !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

// ── Student form ─────────────────────────────────────────────────────────────

function StudentForm({ mode, initial, onClose, onSuccess }: EntityFormProps) {
  const { user } = useAuth()
  const { branches, halaqat } = useData()
  const editing = mode === "edit"
  const student = editing ? (initial as Student | undefined) : undefined
  const saver = useSaver("student", onSuccess)

  // A branch admin (who is not a central admin) can only add students to their own branch.
  const lockedBranch = !user?.isCentral && user?.isBranchAdmin ? user.branchId : null

  const [step, setStep] = useState(1)
  const [name, setName] = useState(student?.name ?? "")
  const [birthDate, setBirthDate] = useState(toIsoDate(student?.birthDate))
  const [gender, setGender] = useState<"ذكر" | "أنثى">(student?.gender === "أنثى" ? "أنثى" : "ذكر")
  const [phone, setPhone] = useState(student?.phone ?? "")
  const [email, setEmail] = useState(student?.email ?? "")
  const [school, setSchool] = useState(student?.school && student.school !== "غير محدد" ? student.school : "")
  const [level, setLevel] = useState<string>(student?.level ?? "ثانوي")
  const [enrollmentDate, setEnrollmentDate] = useState(
    toIsoDate(student?.enrollmentDateRaw) || today(),
  )
  const [branchId, setBranchId] = useState<number | "">(
    student?.branchId ?? lockedBranch ?? "",
  )
  const [halaqaId, setHalaqaId] = useState<number | "">(student?.halaqaId ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const halaqaOptions = useMemo(
    () => halaqat.filter((h) => !branchId || h.branchId === branchId),
    [halaqat, branchId],
  )

  const validateStep = (which: number) => {
    const next: Record<string, string> = {}
    if (which === 1) {
      if (!name.trim()) next.name = "الاسم الكامل مطلوب."
      if (!birthDate) next.birthDate = "تاريخ الميلاد مطلوب."
      else if (birthDate > today()) next.birthDate = "تاريخ الميلاد لا يمكن أن يكون في المستقبل."
      if (!hasContact(phone, email)) next.phone = "أدخل رقم الهاتف أو البريد الإلكتروني."
      if (!validEmail(email)) next.email = "صيغة البريد الإلكتروني غير صحيحة."
    }
    if (which === 2) {
      if (!school.trim()) next.school = "المؤسسة التعليمية مطلوبة."
    }
    if (which === 3) {
      if (!branchId) next.branch = "اختر المقر."
      if (!enrollmentDate) next.enrollmentDate = "تاريخ التسجيل مطلوب."
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const save = () => {
    if (!validateStep(1)) return setStep(1)
    if (!validateStep(2)) return setStep(2)
    if (!validateStep(3)) return setStep(3)

    void saver.run(async () => {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        birthDate,
        gender,
        school: school.trim(),
        level,
        enrollmentDate,
        branchId: Number(branchId),
        halaqaId: halaqaId === "" ? null : Number(halaqaId),
      }
      const saved = editing && student
        ? await api.updateStudent(student.studentId ?? student.id, payload)
        : await api.addStudent(payload)
      return {
        message: editing ? "تم حفظ التغييرات بنجاح." : "تمت إضافة الطالب بنجاح.",
        result: { kind: "student", id: saved.id, name: saved.name, student: saved },
      }
    })
  }

  return (
    <FormShell
      title={`${editing ? "تعديل" : "إضافة"} ${FORM_LABELS.student}`}
      subtitle={editing ? `الخطوة ${step} من 3 · عدّل البيانات ثم احفظ` : `الخطوة ${step} من 3`}
      dirty={saver.dirty}
      markDirty={saver.markDirty}
      saving={saver.saving}
      error={saver.error}
      onClose={onClose}
      steps={[{ label: "المعلومات الشخصية" }, { label: "الدراسة" }, { label: "الجمعية" }]}
      step={step}
      onBack={() => setStep(step - 1)}
      onNext={() => validateStep(step) && setStep(step + 1)}
      onSave={save}
      saveLabel={editing ? "حفظ التغييرات" : "حفظ طالب"}
    >
      {step === 1 && (
        <>
          <div className="form-intro">
            <strong>المعلومات الشخصية</strong>
            <small>البيانات الأساسية ويمكن تعديلها لاحقا.</small>
          </div>
          <div className="form-grid">
            <Field label="الاسم الكامل" required full error={errors.name}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={errors.name ? "invalid" : ""}
                placeholder="أدخل الاسم الكامل"
              />
            </Field>
            <Field label="تاريخ الميلاد" required error={errors.birthDate}>
              <input
                type="date"
                max={today()}
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={errors.birthDate ? "invalid" : ""}
              />
            </Field>
            <Field label="الجنس" required>
              <select value={gender} onChange={(e) => setGender(e.target.value as "ذكر" | "أنثى")}>
                <option>ذكر</option>
                <option>أنثى</option>
              </select>
            </Field>
            <Field label="رقم الهاتف" error={errors.phone}>
              <input
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={errors.phone ? "invalid" : ""}
                placeholder="05 00 00 00 00"
              />
            </Field>
            <Field label="البريد الإلكتروني" error={errors.email}>
              <input
                dir="ltr"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={errors.email ? "invalid" : ""}
                placeholder="name@email.dz"
              />
            </Field>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="form-intro">
            <strong>المعلومات الدراسية</strong>
            <small>بيانات المدرسة والمستوى الدراسي.</small>
          </div>
          <div className="form-grid">
            <Field label="المؤسسة التعليمية" required full error={errors.school}>
              <input
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                className={errors.school ? "invalid" : ""}
                placeholder="مثال: ثانوية ابن خلدون"
              />
            </Field>
            <Field label="المستوى الدراسي" required>
              <select value={level} onChange={(e) => setLevel(e.target.value)}>
                {LEVELS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="form-intro">
            <strong>الارتباط بالجمعية</strong>
            <small>حدّد المقر والحلقة. يمكن إضافة حلقات أخرى لاحقا من ملف الطالب.</small>
          </div>
          <div className="form-grid">
            <Field label="تاريخ التسجيل" required error={errors.enrollmentDate}>
              <input
                type="date"
                value={enrollmentDate}
                onChange={(e) => setEnrollmentDate(e.target.value)}
              />
            </Field>
            <Field label="المقر" required error={errors.branch}>
              <select
                value={branchId}
                disabled={Boolean(lockedBranch)}
                className={errors.branch ? "invalid" : ""}
                onChange={(e) => {
                  setBranchId(e.target.value ? Number(e.target.value) : "")
                  setHalaqaId("")
                }}
              >
                <option value="">اختر المقر</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.location ? ` / ${b.location}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="الحلقة" full>
              <select
                value={halaqaId}
                onChange={(e) => setHalaqaId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">{editing ? "بدون تغيير" : "بدون حلقة حاليا"}</option>
                {halaqaOptions.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} — {h.branch}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="info-alert">
            <Icon name="shield" />
            <span>
              <strong>
                {lockedBranch ? "النطاق الحالي: مقرك فقط" : "النطاق الحالي: حسب صلاحياتك"}
              </strong>
              <small>عند اختيار حلقة، يصل إشعار تلقائي إلى الشيخ المسؤول عنها.</small>
            </span>
          </div>
        </>
      )}
    </FormShell>
  )
}

// ── Sheikh form ──────────────────────────────────────────────────────────────

function SheikhForm({ mode, initial, onClose, onSuccess }: EntityFormProps) {
  const { halaqat } = useData()
  const editing = mode === "edit"
  const detail = editing && initial && "type" in initial && initial.type === "sheikhs" ? initial.data : undefined
  const saver = useSaver("sheikh", onSuccess)

  const [step, setStep] = useState(1)
  const [name, setName] = useState(detail?.name ?? "")
  const [birthDate, setBirthDate] = useState(toIsoDate(detail?.birthDate))
  const [gender, setGender] = useState<"ذكر" | "أنثى">(detail?.gender === "female" ? "أنثى" : "ذكر")
  const [phone, setPhone] = useState(detail?.phone ?? "")
  const [email, setEmail] = useState(detail?.email ?? "")
  const [halaqaIds, setHalaqaIds] = useState<number[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = "الاسم الكامل مطلوب."
    if (!hasContact(phone, email)) next.phone = "أدخل رقم الهاتف أو البريد الإلكتروني."
    if (!validEmail(email)) next.email = "صيغة البريد الإلكتروني غير صحيحة."
    if (birthDate && birthDate > today()) next.birthDate = "تاريخ الميلاد لا يمكن أن يكون في المستقبل."
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const save = () => {
    if (!validate()) return setStep(1)
    void saver.run(async () => {
      if (editing && detail) {
        await api.updatePerson(detail.personId, {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          birthDate: birthDate || undefined,
          gender,
        })
        return {
          message: "تم حفظ التغييرات بنجاح.",
          result: { kind: "sheikh", id: String(detail.personId), name: name.trim() },
        }
      }
      const created = await api.createSheikh({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        birthDate,
        gender,
        halaqaIds,
      })
      return {
        message: "تمت إضافة شيخ بنجاح.",
        result: { kind: "sheikh", id: String(created.personId), name: created.name },
      }
    })
  }

  const steps = editing ? undefined : [{ label: "المعلومات الشخصية" }, { label: "الحلقات" }]

  return (
    <FormShell
      title={`${editing ? "تعديل" : "إضافة"} ${FORM_LABELS.sheikh}`}
      subtitle={
        editing
          ? "عدّل البيانات ثم احفظ التغييرات"
          : `الخطوة ${step} من 2`
      }
      dirty={saver.dirty}
      markDirty={saver.markDirty}
      saving={saver.saving}
      error={saver.error}
      onClose={onClose}
      steps={steps}
      step={step}
      onBack={() => setStep(1)}
      onNext={() => validate() && setStep(2)}
      onSave={save}
      saveLabel={editing ? "حفظ التغييرات" : "حفظ شيخ"}
    >
      {step === 1 && (
        <>
          <div className="form-intro">
            <strong>المعلومات الشخصية</strong>
            <small>البيانات الأساسية ويمكن تعديلها لاحقا.</small>
          </div>
          <div className="form-grid">
            <Field label="الاسم الكامل" required full error={errors.name}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={errors.name ? "invalid" : ""}
                placeholder="أدخل الاسم الكامل"
              />
            </Field>
            <Field label="تاريخ الميلاد" error={errors.birthDate}>
              <input
                type="date"
                max={today()}
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </Field>
            <Field label="الجنس">
              <select value={gender} onChange={(e) => setGender(e.target.value as "ذكر" | "أنثى")}>
                <option>ذكر</option>
                <option>أنثى</option>
              </select>
            </Field>
            <Field label="رقم الهاتف" error={errors.phone}>
              <input
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={errors.phone ? "invalid" : ""}
                placeholder="05 00 00 00 00"
              />
            </Field>
            <Field label="البريد الإلكتروني" error={errors.email}>
              <input
                dir="ltr"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={errors.email ? "invalid" : ""}
                placeholder="name@email.dz"
              />
            </Field>
          </div>
        </>
      )}

      {step === 2 && !editing && (
        <>
          <div className="form-intro">
            <strong>الحلقات التي يدرّسها</strong>
            <small>يمكن تعيين الشيخ إلى عدة حلقات دفعة واحدة، أو تركها لوقت لاحق.</small>
          </div>
          <div className="multi-select">
            {halaqat.length === 0 && <small>لا توجد حلقات بعد.</small>}
            {halaqat.map((h) => (
              <label key={h.id}>
                <input
                  type="checkbox"
                  checked={halaqaIds.includes(h.id)}
                  onChange={(e) =>
                    setHalaqaIds((ids) =>
                      e.target.checked ? [...ids, h.id] : ids.filter((id) => id !== h.id),
                    )
                  }
                />
                <span>
                  {h.name} — {h.branch}
                </span>
              </label>
            ))}
          </div>
        </>
      )}
    </FormShell>
  )
}

// ── Halaqa form ──────────────────────────────────────────────────────────────

function HalaqaForm({ mode, initial, presetBranchId, onClose, onSuccess }: EntityFormProps) {
  const { user } = useAuth()
  const { branches, sheikhs } = useData()
  const editing = mode === "edit"
  const detail = editing && initial && "type" in initial && initial.type === "halaqat" ? initial.data : undefined
  const saver = useSaver("halaqa", onSuccess)

  const lockedBranch = !user?.isCentral && user?.isBranchAdmin ? user.branchId : null

  const [name, setName] = useState(detail?.name ?? "")
  const [level, setLevel] = useState<string>(detail?.level ?? "ثانوي")
  const [branchId, setBranchId] = useState<number | "">(
    detail?.branchId ?? presetBranchId ?? lockedBranch ?? "",
  )
  const [active, setActive] = useState(detail ? detail.isActive : true)
  const [teacherIds, setTeacherIds] = useState<number[]>(detail?.teachers.map((t) => t.id) ?? [])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const save = () => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = "اسم الحلقة مطلوب."
    if (!branchId) next.branch = "اختر المقر."
    setErrors(next)
    if (Object.keys(next).length) return

    void saver.run(async () => {
      const payload = {
        name: name.trim(),
        level,
        branchId: Number(branchId),
        isActive: active,
        teacherIds,
      }
      const saved =
        editing && detail
          ? await api.updateHalaqa(detail.id, payload)
          : await api.createHalaqa(payload)
      return {
        message: editing ? "تم حفظ التغييرات بنجاح." : "تم إنشاء الحلقة بنجاح.",
        result: { kind: "halaqa", id: String(saved.id), name: saved.name },
      }
    })
  }

  return (
    <FormShell
      title={`${editing ? "تعديل" : "إنشاء"} ${FORM_LABELS.halaqa}`}
      subtitle="أكمل المعلومات المطلوبة"
      dirty={saver.dirty}
      markDirty={saver.markDirty}
      saving={saver.saving}
      error={saver.error}
      onClose={onClose}
      onSave={save}
      saveLabel={editing ? "حفظ التغييرات" : "حفظ حلقة"}
    >
      <div className="form-intro">
        <strong>معلومات الحلقة</strong>
        <small>اربط الحلقة بمقر ومستوى وشيوخ.</small>
      </div>
      <div className="form-grid">
        <Field label="اسم الحلقة" required full error={errors.name}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={errors.name ? "invalid" : ""}
            placeholder="مثال: حلقة الإمام مالك"
          />
        </Field>
        <Field label="المستوى" required>
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVELS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="المقر" required error={errors.branch}>
          <select
            value={branchId}
            disabled={Boolean(lockedBranch)}
            className={errors.branch ? "invalid" : ""}
            onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">اختر المقر</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="الحالة">
          <select value={active ? "نشط" : "متوقف"} onChange={(e) => setActive(e.target.value === "نشط")}>
            <option>نشط</option>
            <option>متوقف</option>
          </select>
        </Field>
      </div>
      <div className="multi-select">
        <strong>الشيوخ</strong>
        {sheikhs.length === 0 && <small>لا يوجد شيوخ بعد. أضف شيخا أولا.</small>}
        {sheikhs.map((s) => (
          <label key={s.personId}>
            <input
              type="checkbox"
              checked={teacherIds.includes(s.personId)}
              onChange={(e) =>
                setTeacherIds((ids) =>
                  e.target.checked ? [...ids, s.personId] : ids.filter((id) => id !== s.personId),
                )
              }
            />
            <span>{s.name}</span>
          </label>
        ))}
      </div>
    </FormShell>
  )
}

// ── Branch form ──────────────────────────────────────────────────────────────

const MAX_ADMINS = 3

function BranchForm({ mode, initial, onClose, onSuccess }: EntityFormProps) {
  const editing = mode === "edit"
  const detail = editing && initial && "type" in initial && initial.type === "branches" ? initial.data : undefined
  const saver = useSaver("branch", onSuccess)
  const persons = useAsync(() => api.getPersons(), [])

  const [name, setName] = useState(detail?.name ?? "")
  const [location, setLocation] = useState(detail?.location ?? "")
  const [phone, setPhone] = useState(detail?.phone ?? "")
  const [active, setActive] = useState(detail ? detail.isActive : true)
  const [adminIds, setAdminIds] = useState<number[]>(detail?.adminDetails.map((a) => a.id) ?? [])
  const [pick, setPick] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const nameById = useMemo(() => {
    const map = new Map<number, string>()
    detail?.adminDetails.forEach((a) => map.set(a.id, a.full_name || a.name || String(a.id)))
    persons.data?.forEach((p) => map.set(p.id, p.full_name))
    return map
  }, [detail, persons.data])

  const available = (persons.data ?? []).filter((p) => !adminIds.includes(p.id))

  const save = () => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = "اسم المقر مطلوب."
    if (!location.trim()) next.location = "الموقع مطلوب."
    setErrors(next)
    if (Object.keys(next).length) return

    void saver.run(async () => {
      const payload = {
        name: name.trim(),
        location: location.trim(),
        phone: phone.trim(),
        isActive: active,
        adminIds,
      }
      const saved =
        editing && detail ? await api.updateBranch(detail.id, payload) : await api.createBranch(payload)
      return {
        message: editing ? "تم حفظ التغييرات بنجاح." : "تمت إضافة المقر بنجاح.",
        result: { kind: "branch", id: String(saved.id), name: saved.name },
      }
    })
  }

  return (
    <FormShell
      title={`${editing ? "تعديل" : "إضافة"} ${FORM_LABELS.branch}`}
      subtitle="أكمل المعلومات المطلوبة"
      dirty={saver.dirty}
      markDirty={saver.markDirty}
      saving={saver.saving}
      error={saver.error}
      onClose={onClose}
      onSave={save}
      saveLabel={editing ? "حفظ التغييرات" : "حفظ مقر"}
    >
      <div className="form-intro">
        <strong>معلومات المقر</strong>
        <small>يمكن تعيين ثلاثة مسؤولين كحد أقصى.</small>
      </div>
      <div className="form-grid">
        <Field label="اسم المقر" required full error={errors.name}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={errors.name ? "invalid" : ""}
            placeholder="اسم المقر"
          />
        </Field>
        <Field label="الموقع" required error={errors.location}>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={errors.location ? "invalid" : ""}
            placeholder="المدينة أو العنوان"
          />
        </Field>
        <Field label="الهاتف">
          <input
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="041 00 00 00"
          />
        </Field>
        <Field label="الحالة">
          <select value={active ? "نشط" : "غير نشط"} onChange={(e) => setActive(e.target.value === "نشط")}>
            <option>نشط</option>
            <option>غير نشط</option>
          </select>
        </Field>
      </div>
      <div className="admin-picker">
        <div className="section-title">
          <strong>
            مسؤولو المقر ({adminIds.length}/{MAX_ADMINS})
          </strong>
        </div>
        {adminIds.length < MAX_ADMINS && (
          <div className="inline-toolbar">
            <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="اختر مسؤولا">
              <option value="">
                {persons.loading ? "جارٍ تحميل الأشخاص..." : "اختر شخصا لتعيينه مسؤولا"}
              </option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              icon="plus"
              disabled={!pick}
              onClick={() => {
                setAdminIds((ids) => [...ids, Number(pick)])
                setPick("")
                saver.markDirty()
              }}
            >
              إضافة مسؤول
            </Button>
          </div>
        )}
        {persons.error && <span className="field-error">{persons.error}</span>}
        {adminIds.map((id) => (
          <div key={id}>
            <span className="avatar">{(nameById.get(id) || "؟").slice(0, 2)}</span>
            <strong>{nameById.get(id) || `#${id}`}</strong>
            <button
              type="button"
              aria-label="إزالة المسؤول"
              onClick={() => {
                setAdminIds((ids) => ids.filter((x) => x !== id))
                saver.markDirty()
              }}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
        {adminIds.length >= MAX_ADMINS && (
          <span className="limit-note">
            <Icon name="info" size={16} /> تم بلوغ الحد الأقصى وهو 3 مسؤولي مقر.
          </span>
        )}
      </div>
    </FormShell>
  )
}

// ── Role form ────────────────────────────────────────────────────────────────

function RoleForm({ onClose, onSuccess }: EntityFormProps) {
  const saver = useSaver("role", onSuccess)
  const [name, setName] = useState("")
  const [scope, setScope] = useState<"central" | "branch">("central")
  const [error, setError] = useState("")

  const save = () => {
    if (!name.trim()) return setError("اسم الدور مطلوب.")
    setError("")
    void saver.run(async () => {
      const created = await api.createRole(name.trim(), scope)
      return {
        message: "تمت إضافة الدور بنجاح.",
        result: { kind: "role", id: String(created.roleId), name: created.name },
      }
    })
  }

  return (
    <FormShell
      title={`إضافة ${FORM_LABELS.role}`}
      subtitle="أكمل المعلومات المطلوبة"
      dirty={saver.dirty}
      markDirty={saver.markDirty}
      saving={saver.saving}
      error={saver.error}
      onClose={onClose}
      onSave={save}
      saveLabel="حفظ دور"
    >
      <div className="form-grid">
        <Field label="اسم الدور" required full error={error}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={error ? "invalid" : ""}
            placeholder="مثال: مسؤول الإعلام"
          />
        </Field>
        <Field label="النطاق">
          <select value={scope} onChange={(e) => setScope(e.target.value as "central" | "branch")}>
            <option value="central">مركزي</option>
            <option value="branch">خاص بالمقر</option>
          </select>
        </Field>
      </div>
      <div className="info-alert">
        <Icon name="shield" />
        <span>
          <strong>الصلاحيات تُحدَّد بحسب النطاق</strong>
          <small>الدور المركزي يشمل كل المقرات، ودور المقر مقيَّد بمقر واحد عند التعيين.</small>
        </span>
      </div>
    </FormShell>
  )
}

// ── User form ────────────────────────────────────────────────────────────────

function UserForm({ mode, initial, onClose, onSuccess }: EntityFormProps) {
  const { roles, branches, users } = useData()
  const editing = mode === "edit"
  const detail = editing && initial && "type" in initial && initial.type === "users" ? initial.data : undefined
  const saver = useSaver("user", onSuccess)
  const persons = useAsync(() => (editing ? Promise.resolve([]) : api.getPersons()), [editing])

  const initialRole = detail?.roles[0]
  const [personId, setPersonId] = useState<number | "">(detail?.personId ?? "")
  const [username, setUsername] = useState(detail?.username ?? "")
  const [password, setPassword] = useState("")
  const [roleId, setRoleId] = useState<number | "">(initialRole?.id ?? "")
  const [roleTouched, setRoleTouched] = useState(false)
  const [branchId, setBranchId] = useState<number | "">(
    initialRole?.branch_name ? (branches.find((b) => b.name === initialRole.branch_name)?.id ?? "") : "",
  )
  const [active, setActive] = useState(detail ? detail.isActive : true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const selectedRole = roles.find((r) => r.roleId === roleId)
  const needsBranch = selectedRole?.rawScope === "branch"
  const withAccount = new Set(users.map((u) => u.personId))
  const candidates = (persons.data ?? []).filter((p) => !withAccount.has(p.id))

  const save = () => {
    const next: Record<string, string> = {}
    if (!editing && !personId) next.person = "اختر شخصا."
    if (!username.trim()) next.username = "اسم المستخدم مطلوب."
    if (!editing && password.length < 6) next.password = "كلمة المرور 6 أحرف على الأقل."
    if (editing && password && password.length < 6) next.password = "كلمة المرور 6 أحرف على الأقل."
    if (needsBranch && !branchId) next.branch = "هذا الدور خاص بمقر، اختر المقر."
    setErrors(next)
    if (Object.keys(next).length) return

    void saver.run(async () => {
      if (editing && detail) {
        const updated = await api.updateUser(detail.userId, {
          username: username.trim(),
          password: password || undefined,
          isActive: active,
          // only touch roles when the admin actually changed the selection
          ...(roleTouched && roleId ? { roleId: Number(roleId), branchId: branchId ? Number(branchId) : null } : {}),
        })
        return {
          message: "تم حفظ التغييرات بنجاح.",
          result: { kind: "user", id: String(updated.userId), name: updated.name },
        }
      }
      const created = await api.createUser({
        personId: Number(personId),
        username: username.trim(),
        password,
        roleId: roleId ? Number(roleId) : undefined,
        branchId: needsBranch && branchId ? Number(branchId) : null,
        isActive: active,
      })
      return {
        message: "تمت إضافة حساب المستخدم بنجاح.",
        result: { kind: "user", id: String(created.userId), name: created.name },
      }
    })
  }

  return (
    <FormShell
      title={`${editing ? "تعديل" : "إضافة"} ${FORM_LABELS.user}`}
      subtitle="أكمل المعلومات المطلوبة"
      dirty={saver.dirty}
      markDirty={saver.markDirty}
      saving={saver.saving}
      error={saver.error}
      onClose={onClose}
      onSave={save}
      saveLabel={editing ? "حفظ التغييرات" : "حفظ المستخدم"}
    >
      <div className="form-intro">
        <strong>بيانات الوصول</strong>
        <small>
          {editing
            ? "اترك كلمة المرور فارغة للإبقاء على الحالية."
            : "اختر شخصا موجودا لتجنب تكرار معلوماته."}
        </small>
      </div>
      <div className="form-grid">
        <Field label="الشخص" required full error={errors.person}>
          {editing ? (
            <input value={detail?.name ?? ""} disabled />
          ) : (
            <select
              value={personId}
              onChange={(e) => setPersonId(e.target.value ? Number(e.target.value) : "")}
              className={errors.person ? "invalid" : ""}
            >
              <option value="">{persons.loading ? "جارٍ التحميل..." : "اختر شخصا"}</option>
              {candidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="اسم المستخدم" required error={errors.username}>
          <input
            dir="ltr"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={errors.username ? "invalid" : ""}
            autoComplete="off"
            placeholder="n.boualam"
          />
        </Field>
        <Field label={editing ? "كلمة مرور جديدة" : "كلمة المرور"} required={!editing} error={errors.password}>
          <input
            dir="ltr"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={errors.password ? "invalid" : ""}
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </Field>
        <Field label="الدور">
          <select
            value={roleId}
            onChange={(e) => {
              setRoleId(e.target.value ? Number(e.target.value) : "")
              setRoleTouched(true)
            }}
          >
            <option value="">{editing ? "بدون تغيير" : "بدون دور حاليا"}</option>
            {roles.map((r) => (
              <option key={r.roleId} value={r.roleId}>
                {r.name} ({r.scope})
              </option>
            ))}
          </select>
        </Field>
        {needsBranch && (
          <Field label="المقر" required error={errors.branch}>
            <select
              value={branchId}
              className={errors.branch ? "invalid" : ""}
              onChange={(e) => {
                setBranchId(e.target.value ? Number(e.target.value) : "")
                setRoleTouched(true)
              }}
            >
              <option value="">اختر المقر</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="الحالة">
          <select value={active ? "نشط" : "غير نشط"} onChange={(e) => setActive(e.target.value === "نشط")}>
            <option>نشط</option>
            <option>غير نشط</option>
          </select>
        </Field>
      </div>
    </FormShell>
  )
}

// ── EntityForm (dispatcher) ──────────────────────────────────────────────────

export function EntityForm(props: EntityFormProps) {
  switch (props.kind) {
    case "student":
      return <StudentForm {...props} />
    case "sheikh":
      return <SheikhForm {...props} />
    case "halaqa":
      return <HalaqaForm {...props} />
    case "branch":
      return <BranchForm {...props} />
    case "role":
      return <RoleForm {...props} />
    case "user":
      return <UserForm {...props} />
  }
}
