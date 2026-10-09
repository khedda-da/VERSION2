/** Arabic count phrases: 1 / 2 / 3-10 / 11+ */
function countPhrase(n: number, one: string, two: string, few: string, many: string, zero: string) {
  if (n === 0) return zero
  if (n === 1) return one
  if (n === 2) return two
  if (n <= 10) return `${n} ${few}`
  return `${n} ${many}`
}

export const studentsLabel = (n: number) => `${n} طالبا`

export const halaqatLabel = (n: number) =>
  countPhrase(n, "حلقة واحدة", "حلقتان", "حلقات", "حلقة", "بدون حلقات")

export const adminsLabel = (n: number) =>
  countPhrase(n, "مسؤول واحد", "مسؤولان", "مسؤولين", "مسؤولا", "بدون مسؤولين")

export const usersLabel = (n: number) =>
  countPhrase(n, "مستخدم واحد", "مستخدمان", "مستخدمين", "مستخدما", "بدون مستخدمين")

export const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/)
  return parts.length > 1 ? `${parts[0][0]} ${parts[1][0]}` : name.trim().slice(0, 2)
}

export const levelLabel: Record<string, string> = {
  primary: "ابتدائي",
  middle: "متوسط",
  secondary: "ثانوي",
  university: "جامعي",
}

export const academicLevel = (raw?: string) => (raw ? levelLabel[raw] || raw : "—")

export const toIsoDate = (value?: string | null) => (value ? String(value).slice(0, 10) : "")

export const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || fullName

export function greeting(date = new Date()) {
  return date.getHours() < 12 ? "صباح الخير" : "مساء الخير"
}
