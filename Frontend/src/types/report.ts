export type ReportKey = "branch" | "level" | "halaqa" | "sheikh" | "trends"

export interface ReportRow {
  label: string
  sublabel?: string
  value: number
  extra?: string
}
