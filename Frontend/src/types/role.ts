export interface Role {
  id: string
  roleId: number
  name: string
  scope: "مركزي" | "خاص بالمقر" | "مركزي وفروع"
  rawScope: "central" | "branch"
  userCount: number
  accessLevel: "كامل" | "مخصص" | "مقيد"
  status: "نشط" | "غير نشط"
}
