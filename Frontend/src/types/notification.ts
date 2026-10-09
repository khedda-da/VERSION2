export interface NotificationItem {
  id: string
  notificationId?: number
  title: string
  description: string
  timeAgo: string
  targetScreen: string
  read: boolean
}
