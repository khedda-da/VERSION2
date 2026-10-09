import { Icon, Button, EmptyState } from "@/components/ui"
import { useData } from "@/services/DataContext"
import type { Screen, IconName } from "@/types"

/** The API's "student" target has no id attached, so land on the list instead. */
function resolveTarget(target: string): Screen {
  return (target === "student" ? "students" : target) as Screen
}

export interface NotificationCenterViewProps {
  navigate: (screen: Screen) => void
}

export function NotificationCenterView({
  navigate,
}: NotificationCenterViewProps) {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useData()

  const getNotificationIcon = (target: string): IconName => {
    if (target === "student") return "school"
    if (target === "roles") return "shield"
    return "book"
  }

  return (
    <div className="page">
      <section className="page-heading">
        <div>
          <div className="page-title">الإشعارات</div>
          <p>تابع التغييرات والتعيينات الإدارية المهمة.</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => void markAllNotificationsRead()}
        >
          تحديد الكل كمقروء
        </Button>
      </section>

      <section className="notification-center">
        {notifications.length ? (
          notifications.map((item) => (
            <button
              className={item.read ? "" : "unread"}
              key={item.id}
              onClick={() => {
                void markNotificationRead(item)
                navigate(resolveTarget(item.targetScreen))
              }}
            >
              <span className="notification-icon">
                <Icon name={getNotificationIcon(item.targetScreen)} />
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
                <time>{item.timeAgo}</time>
              </span>
              <Icon name="arrow" />
            </button>
          ))
        ) : (
          <EmptyState
            icon="bell"
            title="أنت مطّلع على كل شيء."
            detail="لا توجد إشعارات جديدة حاليا."
          />
        )}
      </section>
    </div>
  )
}
