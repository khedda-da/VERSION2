import { useState } from "react"
import { Button } from "@/components/ui"
import { api, errorMessage } from "@/services/api"
import { useAuth } from "@/services/AuthContext"

export interface SettingsViewProps {
  onSave: (message: string) => void
}

export function SettingsView({ onSave }: SettingsViewProps) {
  const { user, setUser } = useAuth()
  const stored = (() => {
    try {
      return JSON.parse(window.localStorage.getItem("djam3ya-prefs") || "{}")
    } catch {
      return {}
    }
  })()
  const [section, setSection] = useState("الملف الشخصي")
  const [name, setName] = useState(user?.fullName ?? "")
  const [email, setEmail] = useState(user?.email ?? "")
  const [lang, setLang] = useState<string>(stored.lang ?? "ar")
  const [notificationsEmail, setNotificationsEmail] = useState<boolean>(stored.email ?? true)
  const [notificationsSMS, setNotificationsSMS] = useState<boolean>(stored.sms ?? false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!user || saving) return
    setSaving(true)
    try {
      if (section === "الملف الشخصي") {
        if (!name.trim()) return onSave("الاسم الكامل مطلوب.")
        await api.updatePerson(user.personId, { name: name.trim(), email: email.trim() })
        setUser({ ...user, fullName: name.trim(), email: email.trim() || null })
        onSave("تم حفظ الملف الشخصي بنجاح.")
      } else if (section === "الأمان") {
        if (!currentPassword || !newPassword) return onSave("أدخل كلمة المرور الحالية والجديدة.")
        if (newPassword.length < 6) return onSave("كلمة المرور الجديدة 6 أحرف على الأقل.")
        if (newPassword !== confirmPassword) return onSave("تأكيد كلمة المرور غير مطابق.")
        if (!(await api.verifyPassword(user.username, currentPassword)))
          return onSave("كلمة المرور الحالية غير صحيحة.")
        await api.updateUser(user.id, { password: newPassword })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        onSave("تم تغيير كلمة المرور بنجاح.")
      } else {
        // language / notification preferences are stored on this device only
        window.localStorage.setItem(
          "djam3ya-prefs",
          JSON.stringify({ lang, email: notificationsEmail, sms: notificationsSMS }),
        )
        onSave("تم حفظ التفضيلات على هذا الجهاز.")
      }
    } catch (err) {
      onSave(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <section className="page-heading">
        <div>
          <div className="page-title">الإعدادات</div>
          <p>إعدادات الحساب، اللغة وتجربة الاستخدام.</p>
        </div>
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
        </Button>
      </section>

      <div className="settings-layout">
        <aside>
          {["الملف الشخصي", "الإشعارات", "اللغة والعرض", "الأمان"].map(
            (item) => (
              <button
                key={item}
                className={section === item ? "active" : ""}
                onClick={() => setSection(item)}
              >
                {item}
              </button>
            ),
          )}
        </aside>

        <section className="settings-form">
          <div className="section-title">
            <strong>{section}</strong>
          </div>

          {section === "الملف الشخصي" && (
            <>
              <div className="profile-edit">
                <span className="avatar profile-avatar">{(user?.fullName ?? "").slice(0, 2)}</span>
                <div>
                  <strong>{name}</strong>
                  <small>
                    {user?.roles.map((r) => r.name).join("، ") || "مستخدم"}
                  </small>
                </div>
              </div>
              <div className="form-grid">
                <label>
                  الاسم الكامل
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label>
                  البريد الإلكتروني
                  <input
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              </div>
            </>
          )}

          {section === "الإشعارات" && (
            <div className="permission-matrix">
              <label>
                <div>
                  <strong>إشعارات البريد الإلكتروني</strong>
                  <small>تلقي تقارير شهرية وتنبيهات الحلقات</small>
                </div>
                <input
                  type="checkbox"
                  checked={notificationsEmail}
                  onChange={(e) => setNotificationsEmail(e.target.checked)}
                />
              </label>
              <label>
                <div>
                  <strong>رسائل SMS</strong>
                  <small>إشعارات عاجلة وتحديثات الحساب</small>
                </div>
                <input
                  type="checkbox"
                  checked={notificationsSMS}
                  onChange={(e) => setNotificationsSMS(e.target.checked)}
                />
              </label>
            </div>
          )}

          {section === "اللغة والعرض" && (
            <div className="form-grid">
              <label>
                اللغة
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                >
                  <option value="ar">العربية</option>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </label>
              <label>
                المنطقة الزمنية
                <select defaultValue="algiers">
                  <option value="algiers">الجزائر (GMT+1)</option>
                </select>
              </label>
            </div>
          )}

          {section === "الأمان" && (
            <div className="form-grid">
              <label>
                كلمة المرور الحالية
                <input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </label>
              <label>
                كلمة المرور الجديدة
                <input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </label>
              <label className="full">
                تأكيد كلمة المرور الجديدة
                <input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </label>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
