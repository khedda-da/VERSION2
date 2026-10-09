import type { ExportFormat } from "@/services/api"

export interface ExportRequest {
  title: string
  /** number of records matching the current view */
  count: number
  formats: ExportFormat[]
  /** show the "current results / everything" choice */
  allowScope?: boolean
  run: (format: ExportFormat, scope: "current" | "all") => Promise<void>
}
