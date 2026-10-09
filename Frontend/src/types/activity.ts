export interface ActivityItem {
  id: string | number
  userName: string
  action: string
  target: string
  meta: string
  timeAgo: string
  /** Raw audit info (only present for records coming from /audit) */
  tableName?: string
  recordId?: number | null
  actionType?: "CREATE" | "UPDATE" | "DELETE" | string
}
