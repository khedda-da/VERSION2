import { Icon, IconButton } from "@/components/ui"
import { useAuth } from "@/services/AuthContext"
import { useData } from "@/services/DataContext"
import type { Screen, IconName } from "@/types"

interface NavItem {
  id: Screen
  label: string
  icon: IconName
}

interface NavGroup {
  label: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    label: "",
    items: [
      {
        id: "dashboard",
        label: "نظرة عامة",
        icon: "home",
      },
    ],
  },
  {
    label: "إدارة الجمعية",
    items: [
      { id: "students", label: "الطلاب", icon: "school" },
      { id: "sheikhs", label: "الشيوخ", icon: "user" },
      { id: "halaqat", label: "الحلقات", icon: "book" },
      { id: "branches", label: "المقرات", icon: "branch" },
    ],
  },
  {
    label: "الإدارة",
    items: [
      { id: "roles", label: "الأدوار والصلاحيات", icon: "shield" },
      { id: "users", label: "حسابات المستخدمين", icon: "people" },
      { id: "reports", label: "التقارير", icon: "chart" },
      { id: "activity", label: "سجل النشاط", icon: "clock" },
    ],
  },
]

export interface SidebarProps {
  screen: Screen
  setScreen: (s: Screen) => void
  open: boolean
  onClose: () => void
  onLogout: () => void
}

export function Sidebar({
  screen,
  setScreen,
  open,
  onClose,
  onLogout,
}: SidebarProps) {
  const { user } = useAuth()
  const { students, branches } = useData()
  const central = Boolean(user?.isCentral)
  // /users and /audit are central-only on the server, so hide them for other accounts
  const hidden: Screen[] = central ? [] : ["users", "activity"]
  const groups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => !hidden.includes(i.id)) }))
    .filter((g) => g.items.length)
  const scopeLabel = central
    ? "كل المقرات"
    : user?.isBranchAdmin
      ? branches.find((b) => b.id === user.branchId)?.name || "مقري"
      : "حلقاتي"
  const roleLabel = user?.roles.map((r) => r.name).join("، ") || (user?.isTeacher ? "شيخ" : "مستخدم")

  return (
    <>
      <div className={`scrim ${open ? "show" : ""}`} onClick={onClose} />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <img className="brand-logo" src="/logo.svg" alt="جمعية العلماء المسلمين" />
          <div>
            <strong>الادارة</strong>
            <small>إدارة جمعية القرآن</small>
          </div>
          <IconButton icon="close" label="إغلاق القائمة" onClick={onClose} />
        </div>
        <div className="scope">
          <span className="scope-dot" />
          <div>
            <small>نطاق العرض الحالي</small>
            <strong>{scopeLabel}</strong>
          </div>
          <Icon name="chevron" size={16} />
        </div>
        <nav aria-label="التنقل الرئيسي">
          {groups.map((group) => (
            <div className="nav-group" key={group.label || "main"}>
              {group.label && <div className="nav-label">{group.label}</div>}
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${screen === item.id ? "selected" : ""}`}
                  onClick={() => {
                    setScreen(item.id)
                    onClose()
                  }}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {item.id === "students" && <em>{students.length}</em>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button
            className="user-compact"
            onClick={() => setScreen("settings")}
          >
            <span className="avatar">{(user?.fullName ?? "").slice(0, 2)}</span>
            <span>
              <strong>{user?.fullName}</strong>
              <small>{roleLabel}</small>
            </span>
            <Icon name="more" />
          </button>
          <button className="nav-item" onClick={onLogout}>
            <Icon name="logout" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  )
}
