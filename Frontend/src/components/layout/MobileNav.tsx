import { Icon } from "@/components/ui"
import type { Screen, IconName } from "@/types"

export interface MobileNavProps {
  screen: Screen
  navigate: (s: Screen) => void
}

const navItems: [Screen, string, IconName][] = [
  ["dashboard", "الرئيسية", "home"],
  ["halaqat", "الحلقات", "book"],
  ["settings", "المزيد", "more"],
]

export function MobileNav({ screen, navigate }: MobileNavProps) {
  return (
    <nav className="mobile-nav" aria-label="التنقل على الهاتف">
      {navItems.map(([id, label, icon]) => (
        <button
          key={id}
          className={screen === id ? "active" : ""}
          onClick={() => navigate(id)}
        >
          <Icon name={icon} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
