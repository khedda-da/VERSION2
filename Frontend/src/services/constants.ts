import type { EntityFilters, EntityType, IconName, StudentFilters } from "@/types"

/** Static labels/icons for the entity screens (the data itself comes from the API). */
export const entityMeta: Record<
  EntityType,
  { title: string; subtitle: string; action: string; icon: IconName }
> = {
  sheikhs: {
    title: "الشيوخ",
    subtitle: "إدارة الشيوخ والحلقات التي يشرفون عليها.",
    action: "إضافة شيخ",
    icon: "user",
  },
  halaqat: {
    title: "الحلقات",
    subtitle: "عرض الحلقات، شيوخها وطلابها حسب المقر.",
    action: "إنشاء حلقة",
    icon: "book",
  },
  branches: {
    title: "المقرات",
    subtitle: "إدارة البنية الجغرافية ومسؤولي كل مقر.",
    action: "إضافة مقر",
    icon: "branch",
  },
  roles: {
    title: "الأدوار والصلاحيات",
    subtitle: "تعيين أدوار مركزية أو مرتبطة بمقر محدد.",
    action: "إضافة دور",
    icon: "shield",
  },
  users: {
    title: "حسابات المستخدمين",
    subtitle: "إدارة الحسابات، النطاقات وآخر عمليات الدخول.",
    action: "إضافة مستخدم",
    icon: "people",
  },
}

export const profileTabs: Record<EntityType, string[]> = {
  sheikhs: ["الحلقات", "الطلاب", "النشاط"],
  halaqat: ["الطلاب", "الشيوخ", "إحصائيات"],
  branches: ["الحلقات", "المسؤولون", "الشيوخ"],
  roles: ["الصلاحيات", "المستخدمون"],
  users: ["الأدوار", "النشاط"],
}

/** What the backend currently supports per entity type. */
export const entityCapabilities: Record<EntityType, { edit: boolean; remove: boolean }> = {
  sheikhs: { edit: true, remove: true },
  halaqat: { edit: true, remove: true },
  branches: { edit: true, remove: true },
  roles: { edit: false, remove: false }, // the API only offers create + assign
  users: { edit: true, remove: true },
}

export const LEVELS = ["ابتدائي", "متوسط", "ثانوي", "جامعي"] as const

export const emptyStudentFilters: StudentFilters = {
  branch: "",
  halaqa: "",
  sheikh: "",
  level: "",
  school: "",
  minAge: "",
  maxAge: "",
}

export const emptyEntityFilters: EntityFilters = {
  branch: "",
  halaqa: "",
  sheikh: "",
  status: "",
}
