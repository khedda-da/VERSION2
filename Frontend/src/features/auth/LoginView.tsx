import { useState } from "react"
import { Icon, Button } from "@/components/ui"
import { useAuth } from "@/services/AuthContext"
import { errorMessage } from "@/services/api"

export function LoginView() {
  const { login, goToSetup, goToRegister, needsSetup, registrationOpen, notice } = useAuth()
  const [recovery, setRecovery] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError("")
    setSubmitting(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <section className="login-brand">
        <img
          className="brand-logo large"
          src="/logo.svg"
          alt="جمعية العلماء المسلمين"
        />
        <strong>الادارة</strong>
        <p>إدارة الجمعية، الأشخاص والحلقات في مكان واحد واضح وآمن.</p>
        <div className="login-quote">
          “بيانات معقدة، أصبحت إنسانية وسهلة الفهم.”
        </div>
      </section>
      <main className="login-form">
        <div className="language-switch">العربية · Français · English</div>
        <div>
          <div className="page-title">مرحبا بعودتك</div>
          <p>سجّل الدخول للوصول إلى نطاق عملك.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            اسم المستخدم
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="مثال: n.boualam"
              autoComplete="username"
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
              autoComplete="current-password"
              required
            />
          </label>
          {notice && !error && (
            <div className="info-alert" role="status">
              <Icon name="mail" />
              <span>
                <small>{notice}</small>
              </span>
            </div>
          )}
          {error && (
            <div className="info-alert" role="alert">
              <Icon name="warning" />
              <span>
                <strong>تعذر تسجيل الدخول</strong>
                <small>{error}</small>
              </span>
            </div>
          )}
          <div className="login-options">
            {registrationOpen !== false && (
              <button type="button" className="text-link" onClick={goToRegister}>
                إنشاء حساب جديد
              </button>
            )}
            {needsSetup !== false && (
              <button
                type="button"
                className="text-link"
                onClick={goToSetup}
                title="إذا كانت هذه أول مرة تقوم بتشغيل النظام وتريد إنشاء حساب المدير الأول"
              >
                إعداد النظام (أول استخدام)
              </button>
            )}
            <button type="button" onClick={() => setRecovery(!recovery)}>
              نسيت كلمة المرور؟
            </button>
          </div>
          {recovery && (
            <div className="info-alert">
              <Icon name="mail" />
              <span>
                <strong>استعادة الوصول</strong>
                <small>
                  تواصل مع المدير المركزي لإعادة ضبط كلمة المرور من صفحة حسابات
                  المستخدمين.
                </small>
              </span>
            </div>
          )}
          <Button type="submit" disabled={submitting}>
            {submitting ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
          </Button>
        </form>
        <small className="secure-note">
          <Icon name="shield" size={16} /> دخول محمي. لا تشارك بيانات حسابك مع
          أي شخص.
        </small>
      </main>
    </div>
  )
}
