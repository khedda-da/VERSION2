import type { Branch, EntityType, Halaqa, Role, Sheikh, User } from "@/types"
import { api } from "@/services/api"
import type {
  BranchDetail,
  HalaqaDetail,
  RoleDetail,
  SheikhDetail,
  UserDetail,
} from "@/services/api"
import { adminsLabel, halaqatLabel, studentsLabel, usersLabel } from "@/utils/format"

export interface EntityRow {
  id: string
  name: string
  col1: string
  col2: string
  badge: string
  inactive: boolean
  /** values used by the filter drawer */
  attrs: {
    branch?: string[]
    halaqa?: string[]
    sheikh?: string[]
    level?: string
    status?: string
  }
}

export interface EntitySources {
  sheikhs: Sheikh[]
  halaqat: Halaqa[]
  branches: Branch[]
  roles: Role[]
  users: User[]
}

const isInactive = (status: string) => status === "غير نشط" || status === "متوقف"

export function buildEntityRows(type: EntityType, src: EntitySources): EntityRow[] {
  switch (type) {
    case "sheikhs":
      return src.sheikhs.map((s) => ({
        id: String(s.personId),
        name: s.name,
        col1: halaqatLabel(s.halaqat.length),
        col2: s.branches.join("، ") || "—",
        badge: s.status,
        inactive: isInactive(s.status),
        attrs: { branch: s.branches, halaqa: s.halaqat, status: s.status },
      }))
    case "halaqat":
      return src.halaqat.map((h) => ({
        id: String(h.id),
        name: h.name,
        col1: h.branch,
        col2: h.sheikh,
        badge: h.status,
        inactive: isInactive(h.status),
        attrs: { branch: [h.branch], sheikh: h.sheikhs, level: h.level, status: h.status },
      }))
    case "branches":
      return src.branches.map((b) => ({
        id: String(b.id),
        name: b.name,
        col1: b.location || "—",
        col2: `${studentsLabel(b.studentCount)} · ${adminsLabel(b.adminCount)}`,
        badge: b.status,
        inactive: isInactive(b.status),
        attrs: { status: b.status },
      }))
    case "roles":
      return src.roles.map((r) => ({
        id: String(r.roleId),
        name: r.name,
        col1: r.scope,
        col2: usersLabel(r.userCount),
        badge: r.accessLevel,
        inactive: r.status === "غير نشط",
        attrs: { status: r.status },
      }))
    case "users":
      return src.users.map((u) => ({
        id: String(u.userId),
        name: u.name,
        col1: u.role,
        col2: u.branch,
        badge: u.status,
        inactive: isInactive(u.status),
        attrs: { status: u.status },
      }))
  }
}

// ── Detail loading ──────────────────────────────────────────────────────────


export type EntityDetail =
  | { type: "sheikhs"; data: SheikhDetail }
  | { type: "halaqat"; data: HalaqaDetail }
  | { type: "branches"; data: BranchDetail }
  | { type: "roles"; data: RoleDetail }
  | { type: "users"; data: UserDetail }

export async function loadEntityDetail(type: EntityType, id: string): Promise<EntityDetail> {
  switch (type) {
    case "sheikhs":
      return { type, data: await api.getSheikh(id) }
    case "halaqat":
      return { type, data: await api.getHalaqa(id) }
    case "branches":
      return { type, data: await api.getBranch(id) }
    case "roles":
      return { type, data: await api.getRole(id) }
    case "users":
      return { type, data: await api.getUser(id) }
  }
}

/** Table name used by the backend audit log for each entity type. */
export const AUDIT_TABLE: Record<EntityType, string> = {
  sheikhs: "persons",
  halaqat: "halaqat",
  branches: "branches",
  roles: "roles",
  users: "users",
}

/** Numeric id used as `recordId` in the audit log. */
export function auditRecordId(detail: EntityDetail): number {
  switch (detail.type) {
    case "sheikhs":
      return detail.data.personId
    case "roles":
      return detail.data.roleId
    case "users":
      return detail.data.userId
    default:
      return Number(detail.data.id)
  }
}
