export const CENTRAL_ROLES = [
  "مسؤول المال",
  "مسؤول التنظيم",
  "رئيس الشعبة",
  "مسؤول الإعلام والاتصال",
  "مسؤول الشباب",
  "مسؤول الأحداث الثقافية",
  "مسؤول الإدارة",
] as const

export const BRANCH_ROLES = [
  "مسؤول مقر",
] as const

export const ALL_ROLES = [...CENTRAL_ROLES, ...BRANCH_ROLES] as const

export const MAX_ADMINS_PER_BRANCH = 3

export const PERSON_TYPES = ["student", "sheikh", "both"] as const
export type PersonType = (typeof PERSON_TYPES)[number]

export const GENDER_TYPES = ["male", "female"] as const
export type GenderType = (typeof GENDER_TYPES)[number]

export const ACADEMIC_LEVELS = [
  "primary",
  "middle",
  "secondary",
  "university",
] as const
export type AcademicLevel = (typeof ACADEMIC_LEVELS)[number]

export const ACADEMIC_LEVELS_ARABIC: Record<AcademicLevel, string> = {
  primary: "ابتدائي",
  middle: "متوسط",
  secondary: "ثانوي",
  university: "جامعي",
}

export const ARABIC_TO_ACADEMIC_LEVEL: Record<string, AcademicLevel> = {
  ابتدائي: "primary",
  متوسط: "middle",
  ثانوي: "secondary",
  جامعي: "university",
  primary: "primary",
  middle: "middle",
  secondary: "secondary",
  university: "university",
}

export const HALAQA_ROLES = ["teacher", "student", "supervisor"] as const
export type HalaqaRole = (typeof HALAQA_ROLES)[number]
