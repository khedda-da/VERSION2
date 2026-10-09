/**
 * Normalizes Arabic text to make search insensitive to diacritics and letter variations
 */
export function normalizeArabic(text: string): string {
  if (!text) return ""
  return text
    .trim()
    .toLowerCase()
    // Remove tatweel / kashida
    .replace(/\u0640/g, "")
    // Remove diacritics (tashkeel)
    .replace(/[\u064B-\u065F\u0670]/g, "")
    // Normalize alif variations: أ, إ, آ, ٱ -> ا
    .replace(/[أإآٱ]/g, "ا")
    // Normalize teh marbuta: ة -> ه
    .replace(/ة/g, "ه")
    // Normalize alef maksura: ى -> ي
    .replace(/ى/g, "ي")
    // Normalize Persian/Urdu kaf & ya if present
    .replace(/ك/g, "ك")
    .replace(/ي/g, "ي")
}

/**
 * Calculates age in years given a birth date string or Date object
 */
export function calculateAge(birthDate: string | Date | null | undefined): number {
  if (!birthDate) return 0
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return 0
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

/**
 * Format date in Arabic string (e.g. "12 سبتمبر 2025")
 */
export function formatDateArabic(date: string | Date | null | undefined): string {
  if (!date) return ""
  const d = new Date(date)
  if (isNaN(d.getTime())) return String(date)
  return new Intl.DateTimeFormat("ar-DZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d)
}
