import { useState } from "react"
import { Icon, Button } from "@/components/ui"
import { useAuth } from "@/services/AuthContext"
import { errorMessage } from "@/services/api"

export function RegisterView() {
  const { register, goToLogin } = useAuth()
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError("")

    if (password.length < 8) return setError("كلمة المرور يجب أن لا تقل عن 8 أحرف.")
    if (password !== confirm) return setError("كلمتا المرور غير متطابقتين.")
    if (!email.trim() && !phone.trim()) return setError("أدخل البريد الإلكتروني أو رقم الهاتف.")

    setSubmitting(true)
    try {
      await register({
        fullName: fullName.trim(),
        username: username.trim(),
        password,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      })
      setDone(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page" dir="rtl">
      <section className="login-brand">
        <img className="brand-logo large" src="/logo.svg" alt="جمعية العلماء المسلمين" />
        <strong>الادارة</strong>
        <p>أنشئ حسابك لطلب الانضمام إلى النظام. تتم مراجعة الطلبات من قبل إدارة الجمعية.</p>
        <div className="login-quote">“لا يتم تفعيل أي حساب جديد قبل موافقة الإدارة.”</div>
      </section>
      <main className="login-form">
        {done ? (
          <>
            <div>
              <div className="page-title">تم استلام طلبك</div>
              <p>حسابك الآن بانتظار موافقة إدارة الجمعية.</p>
            </div>
            <div className="info-alert" role="status">
              <Icon name="check" />
              <span>
                <strong>ماذا بعد؟</strong>
                <small>
                  بعد أن توافق الإدارة على طلبك وتحدّد صلاحياتك يمكنك تسجيل الدخول باسم المستخدم
                  <b dir="ltr"> {username.trim()} </b>
                  وكلمة المرور التي أدخلتها.
                </small>
              </span>
            </div>
            <Button onClick={goToLogin}>العودة إلى تسجيل الدخول</Button>
          </>
        ) : (
          <>
            <div>
              <div className="page-title">إنشاء حساب جديد</div>
              <p>املأ البيانات التالية وسيصل طلبك إلى الإدارة للموافقة عليه.</p>
            </div>
            <form onSubmit={handleSubmit}>
              <label>
                الاسم الكامل
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
              </label>
              <label>
                اسم المستخدم
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: n.boualam"
                  autoComplete="username"
                  dir="ltr"
                  pattern="[A-Za-z0-9._\-]{3,50}"
                  title="3 إلى 50 حرفًا: أحرف لاتينية وأرقام و . _ -"
                  required
                />
              </label>
              <label>
                البريد الإلكتروني
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" dir="ltr" />
              </label>
              <label>
                رقم الهاتف
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" dir="ltr" />
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
                {submitting ? "جارٍ الإرسال..." : "إنشاء الحساب"}
              </Button>
              <div className="login-options" style={{ justifyContent: "center" }}>
                <button type="button" onClick={goToLogin}>
                  لديك حساب بالفعل؟ تسجيل الدخول
                </button>
              </div>
            </form>
            <small className="secure-note">
              <Icon name="shield" size={16} /> لن تتمكن من الدخول قبل موافقة الإدارة على طلبك.
            </small>
          </>
        )}
      </main>
    </div>
  )
}
