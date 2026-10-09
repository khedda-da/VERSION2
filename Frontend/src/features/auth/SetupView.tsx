import { useState } from "react"
import { Icon, Button } from "@/components/ui"
import { useAuth } from "@/services/AuthContext"
import { errorMessage } from "@/services/api"

export function SetupView() {
  const { setup } = useAuth()
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError("")

    if (password.length < 8) return setError("كلمة المرور يجب أن لا تقل عن 8 أحرف.")
    if (password !== confirm) return setError("كلمتا المرور غير متطابقتين.")
    if (!code.trim()) return setError("أدخل رمز الإنشاء.")

    setSubmitting(true)
    try {
      await setup({
        username: username.trim(),
        email: email.trim(),
        password,
        code: code.trim(),
      })
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page" dir="rtl">
      <section className="login-brand">
        <img className="brand-logo large" src="/logo.svg" alt="جمعية العلماء المسلمين" />
        <strong>الادارة</strong>
        <p>مرحبا بك! أنشئ حساب المدير الأول لبدء استخدام النظام.</p>
        <div className="login-quote">“هذا الحساب يملك كامل الصلاحيات المركزية.”</div>
      </section>
      <main className="login-form">
        <div>
          <div className="page-title">إعداد النظام</div>
          <p>لا توجد حسابات بعد. أنشئ حساب المدير للمتابعة.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            اسم المستخدم
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="مثال: admin"
              autoComplete="username"
              dir="ltr"
              pattern="[A-Za-z0-9._\-]{3,50}"
              title="3 إلى 50 حرفًا: أحرف لاتينية وأرقام و . _ -"
              required
            />
          </label>
          <label>
            البريد الإلكتروني
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              dir="ltr"
              required
            />
          </label>
          <label>
            كلمة المرور
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label>
            تأكيد كلمة المرور
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            رمز الإنشاء
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              dir="ltr"
              required
            />
          </label>
          {error && (
            <div className="info-alert" role="alert">
              <Icon name="warning" />
              <span>
                <strong>تعذر إنشاء الحساب</strong>
                <small>{error}</small>
              </span>
            </div>
          )}
          <Button type="submit" disabled={submitting}>
            {submitting ? "جارٍ الإنشاء..." : "إنشاء حساب المدير"}
          </Button>
        </form>
        <small className="secure-note">
          <Icon name="shield" size={16} /> تظهر هذه الصفحة مرة واحدة فقط، قبل إنشاء أول حساب.
          يُطلب نفس الرمز لاحقًا عند إضافة أي حساب جديد.
        </small>
      </main>
    </div>
  )
}
