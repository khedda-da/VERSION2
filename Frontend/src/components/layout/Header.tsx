import { Icon, IconButton } from "@/components/ui"

export interface HeaderProps {
  title: string
  onMenu: () => void
  onSearch: () => void
  onNotifications: () => void
  onLanguage: () => void
  darkMode: boolean
  onThemeToggle: () => void
  unreadCount: number
}

export function Header({
  title,
  onMenu,
  onSearch,
  onNotifications,
  onLanguage,
  darkMode,
  onThemeToggle,
  unreadCount,
}: HeaderProps) {
  return (
    <header className="topbar">
      <div className="mobile-title">
        <IconButton icon="menu" label="فتح القائمة" onClick={onMenu} />
        <strong>{title}</strong>
      </div>
      <div className="breadcrumbs">
        <span>الجمعية</span>
        <Icon name="chevron" size={15} />
        <strong>{title}</strong>
      </div>
      <button className="global-search" onClick={onSearch}>
        <Icon name="search" />
        <span>ابحث عن طالب، شيخ، حلقة...</span>
        <kbd>
          <Icon name="command" size={14} /> K
        </kbd>
      </button>
      <div className="top-actions">
        <button className="language" onClick={onLanguage}>
          العربية <Icon name="chevron" size={14} />
        </button>
        <IconButton
          icon={darkMode ? "sun" : "moon"}
          label={darkMode ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
          onClick={onThemeToggle}
        />
        <IconButton
          icon="bell"
          label={`الإشعارات، ${unreadCount} غير مقروءة`}
          onClick={onNotifications}
          active={unreadCount > 0}
        />
      </div>
    </header>
  )
}
