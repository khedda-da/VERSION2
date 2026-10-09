import type {
  Student,
  HalaqaRecord,
  EntityType,
  IconName,
  StudentFilters,
  EntityFilters,
} from "@/types"

export const initialStudents: Student[] = [
  {
    id: "DJ-1042",
    name: "محمد أمين بن علي",
    initials: "م أ",
    age: 16,
    school: "ثانوية ابن خلدون",
    level: "ثانوي",
    branch: "المقر الثاني",
    halaqa: "حلقة الإمام مالك",
    sheikh: "الشيخ أحمد",
    date: "12 سبتمبر 2025",
    status: "نشط",
    phone: "0556 43 28 19",
    email: "mohamed.amine@email.dz",
    birthDate: "2009-03-14",
    gender: "ذكر",
  },
  {
    id: "DJ-1038",
    name: "ياسين بن صالح",
    initials: "ي ب",
    age: 13,
    school: "متوسطة الأمير عبد القادر",
    level: "متوسط",
    branch: "المقر الأول",
    halaqa: "حلقة البخاري",
    sheikh: "الشيخ ياسين",
    date: "08 سبتمبر 2025",
    status: "نشط",
    phone: "0551 22 33 44",
    email: "yassine@email.dz",
    birthDate: "2012-07-20",
    gender: "ذكر",
  },
  {
    id: "DJ-1029",
    name: "أحمد عبد القادر",
    initials: "أ ع",
    age: 10,
    school: "ابتدائية النور",
    level: "ابتدائي",
    branch: "المقر الثاني",
    halaqa: "حلقة النووي",
    sheikh: "الشيخ محمد",
    date: "02 سبتمبر 2025",
    status: "نشط",
    phone: "0553 77 88 99",
    email: "ahmed.kader@email.dz",
    birthDate: "2015-11-05",
    gender: "ذكر",
  },
  {
    id: "DJ-1017",
    name: "عبد الرحمن قادري",
    initials: "ع ق",
    age: 19,
    school: "جامعة وهران 1",
    level: "جامعي",
    branch: "المقر الثالث",
    halaqa: "حلقة ابن الجزري",
    sheikh: "الشيخ عبد الرحمن",
    date: "28 أغسطس 2025",
    status: "متوقف",
    phone: "0558 11 44 77",
    email: "abderrahmane@email.dz",
    birthDate: "2006-01-18",
    gender: "ذكر",
  },
  {
    id: "DJ-1008",
    name: "أنس بوشارب",
    initials: "أ ب",
    age: 15,
    school: "ثانوية العقيد لطفي",
    level: "ثانوي",
    branch: "المقر الثاني",
    halaqa: "حلقة الإمام مالك",
    sheikh: "الشيخ أحمد",
    date: "21 أغسطس 2025",
    status: "نشط",
    phone: "0555 99 66 33",
    email: "anes@email.dz",
    birthDate: "2010-09-12",
    gender: "ذكر",
  },
]

export const halaqaRecords: HalaqaRecord[] = [
  {
    name: "حلقة الإمام مالك",
    level: "ثانوي",
    branch: "المقر الثاني",
    sheikh: "الشيخ أحمد",
    students: 32,
  },
  {
    name: "حلقة البخاري",
    level: "متوسط",
    branch: "المقر الأول",
    sheikh: "الشيخ ياسين",
    students: 28,
  },
  {
    name: "حلقة النووي",
    level: "ابتدائي",
    branch: "المقر الثاني",
    sheikh: "الشيخ محمد",
    students: 24,
  },
  {
    name: "حلقة ابن الجزري",
    level: "جامعي",
    branch: "المقر الثالث",
    sheikh: "الشيخ أحمد",
    students: 18,
  },
  {
    name: "حلقة القرطبي",
    level: "متوسط",
    branch: "المقر الأول",
    sheikh: "الشيخ أحمد",
    students: 14,
  },
]

export const entityContent: Record<
  EntityType,
  {
    title: string
    subtitle: string
    action: string
    icon: IconName
    rows: string[][]
  }
> = {
  sheikhs: {
    title: "الشيوخ",
    subtitle: "إدارة الشيوخ والحلقات التي يشرفون عليها.",
    action: "إضافة شيخ",
    icon: "user",
    rows: [
      ["الشيخ أحمد", "3 حلقات", "المقر الأول، الثاني", "64 طالبا"],
      ["الشيخ ياسين", "حلقتان", "المقر الأول", "46 طالبا"],
      ["الشيخ محمد", "حلقة واحدة", "المقر الثاني", "24 طالبا"],
    ],
  },
  halaqat: {
    title: "الحلقات",
    subtitle: "عرض الحلقات، شيوخها وطلابها حسب المقر.",
    action: "إنشاء حلقة",
    icon: "book",
    rows: [
      ["حلقة الإمام مالك", "المقر الثاني", "الشيخ أحمد", "32 طالبا"],
      ["حلقة البخاري", "المقر الأول", "الشيخ ياسين", "28 طالبا"],
      ["حلقة النووي", "المقر الثاني", "الشيخ محمد", "24 طالبا"],
      ["حلقة ابن الجزري", "المقر الثالث", "الشيخ أحمد", "18 طالبا"],
      ["حلقة القرطبي", "المقر الأول", "الشيخ أحمد", "14 طالبا"],
    ],
  },
  branches: {
    title: "المقرات",
    subtitle: "إدارة البنية الجغرافية ومسؤولي كل مقر.",
    action: "إضافة مقر",
    icon: "branch",
    rows: [
      ["المقر الأول", "الجزائر الوسطى", "412 طالبا", "3 مسؤولين"],
      ["المقر الثاني", "وهران", "368 طالبا", "2 مسؤولان"],
      ["المقر الثالث", "قسنطينة", "276 طالبا", "3 مسؤولين"],
      ["المقر الرابع", "سطيف", "192 طالبا", "مسؤولان"],
    ],
  },
  roles: {
    title: "الأدوار والصلاحيات",
    subtitle: "تعيين أدوار مركزية أو مرتبطة بمقر محدد.",
    action: "إضافة دور",
    icon: "shield",
    rows: [
      ["المالية", "مركزي", "3 مستخدمين", "مخصص"],
      ["إدارة التنظيم", "مركزي", "6 مستخدمين", "كامل"],
      ["رئيس المقر", "خاص بالمقر", "4 مستخدمين", "مقيد"],
      ["الإعلام والاتصال", "مركزي", "3 مستخدمين", "مخصص"],
      ["الشباب", "مركزي وفروع", "5 مستخدمين", "مخصص"],
    ],
  },
  users: {
    title: "حسابات المستخدمين",
    subtitle: "إدارة الحسابات، النطاقات وآخر عمليات الدخول.",
    action: "إضافة مستخدم",
    icon: "people",
    rows: [
      ["سميرة قادري", "مسؤول مقر", "المقر الثاني", "نشط"],
      ["أحمد بن يوسف", "مسؤول مقر", "المقر الأول", "نشط"],
      ["فاطمة الزهراء", "مشرف تقارير", "مركزي", "نشط"],
      ["بلقاسم منصوري", "أمين مال", "مركزي", "غير نشط"],
    ],
  },
}

export type EntityAttributeValue = {
  branch?: string
  sheikh?: string
  level?: string
  location?: string
  status?: string
}

export const entityAttributes: Record<string, EntityAttributeValue> = {
  "الشيخ أحمد": { branch: "المقر الأول، الثاني", status: "نشط" },
  "الشيخ ياسين": { branch: "المقر الأول", status: "نشط" },
  "الشيخ محمد": { branch: "المقر الثاني", status: "نشط" },
  "حلقة الإمام مالك": {
    branch: "المقر الثاني",
    sheikh: "الشيخ أحمد",
    level: "ثانوي",
    status: "نشط",
  },
  "حلقة البخاري": {
    branch: "المقر الأول",
    sheikh: "الشيخ ياسين",
    level: "متوسط",
    status: "نشط",
  },
  "حلقة النووي": {
    branch: "المقر الثاني",
    sheikh: "الشيخ محمد",
    level: "ابتدائي",
    status: "نشط",
  },
  "حلقة ابن الجزري": {
    branch: "المقر الثالث",
    sheikh: "الشيخ أحمد",
    level: "جامعي",
    status: "نشط",
  },
  "حلقة القرطبي": {
    branch: "المقر الأول",
    sheikh: "الشيخ أحمد",
    level: "متوسط",
    status: "نشط",
  },
  "المقر الأول": { location: "الجزائر الوسطى", status: "نشط" },
  "المقر الثاني": { location: "وهران", status: "نشط" },
  "المقر الثالث": { location: "قسنطينة", status: "نشط" },
  "المقر الرابع": { location: "سطيف", status: "غير نشط" },
}

export const profileTabs: Record<EntityType, string[]> = {
  sheikhs: ["الحلقات", "الطلاب", "النشاط"],
  halaqat: ["الطلاب", "الشيوخ", "إحصائيات"],
  branches: ["الحلقات", "المسؤولون", "الشيوخ"],
  roles: ["الصلاحيات", "المستخدمون"],
  users: ["الأدوار", "النشاط"],
}

export const activityRows: string[][] = [
  [
    "نبيل بوعلام",
    "أضاف الطالب",
    "محمد أمين بن علي",
    "المقر الثاني",
    "اليوم، 14:32",
  ],
  [
    "سميرة قادري",
    "حدّثت الحلقة",
    "حلقة الإمام مالك",
    "المقر الثاني",
    "اليوم، 13:57",
  ],
  [
    "أحمد بن يوسف",
    "عيّن الشيخ ياسين",
    "حلقة البخاري",
    "المقر الأول",
    "اليوم، 12:18",
  ],
  ["مدير النظام", "أنشأ حسابا", "سميرة قادري", "نطاق مركزي", "أمس، 16:25"],
]

export const initialNotifications = [
  {
    id: "notif-1",
    title: "أضيف طالب جديد إلى حلقتك",
    description: "محمد أمين · حلقة الإمام مالك",
    timeAgo: "منذ 8 دقائق",
    targetScreen: "student",
    read: false,
  },
  {
    id: "notif-2",
    title: "تم تعيينك في حلقة جديدة",
    description: "حلقة ابن الجزري · المقر الثالث",
    timeAgo: "منذ ساعتين",
    targetScreen: "halaqat",
    read: false,
  },
  {
    id: "notif-3",
    title: "تم تحديث بيانات الحلقة",
    description: "حلقة البخاري",
    timeAgo: "أمس",
    targetScreen: "halaqat",
    read: false,
  },
  {
    id: "notif-4",
    title: "إشعار إداري",
    description: "تم تحديث صلاحيات إدارة المقر",
    timeAgo: "منذ يومين",
    targetScreen: "roles",
    read: true,
  },
]

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
