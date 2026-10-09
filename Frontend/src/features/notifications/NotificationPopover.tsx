import { Button } from "@/components/ui"
import { useData } from "@/services/DataContext"
import type { Screen } from "@/types"

/** The API's "student" target has no id attached, so land on the list instead. */
function resolveTarget(target: string): Screen {
  return (target === "student" ? "students" : target) as Screen
}

export interface NotificationPopoverProps {
  onClose: () => void
  onOpenCenter: () => void
  navigate: (screen: Screen) => void
}

export function NotificationPopover({
  onClose,
  onOpenCenter,
  navigate,
}: NotificationPopoverProps) {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useData()


  return (
    <div className="popover-layer" onClick={onClose}>
      <aside
        className="notifications-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <div>
            <strong>الإشعارات</strong>
            <small>{unreadCount} غير مقروءة</small>
          </div>
          <button
            className="text-action"
            onClick={() => void markAllNotificationsRead()}
          >
            تحديد الكل كمقروء
          </button>
        </div>
        {notifications.slice(0, 3).map((item) => (
          <button
            className={`notification ${item.read ? "" : "unread"}`}
            key={item.id}
            onClick={() => {
              void markNotificationRead(item)
              navigate(resolveTarget(item.targetScreen))
              onClose()
            }}
          >
            <i />
            <span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
              <time>{item.timeAgo}</time>
            </span>
          </button>
        ))}
        <Button
          variant="ghost"
          onClick={() => {
            onOpenCenter()
            onClose()
          }}
        >
          عرض مركز الإشعارات
        </Button>
      </aside>
    </div>
  )
}
