import type { Role, Status } from "@/lib/types"

export const PERMISSIONS = [
  "ticket:assign",
  "ticket:status",
  "ticket:priority",
  "ticket:delete",
  "category:manage",
  "user:manage",
  "comment:any",
] as const

export type Permission = (typeof PERMISSIONS)[number]

const MODERATOR_PERMISSIONS: Permission[] = [
  "ticket:assign",
  "ticket:status",
  "ticket:priority",
  "comment:any",
]

const ADMIN_PERMISSIONS: Permission[] = [...MODERATOR_PERMISSIONS, "ticket:delete", "category:manage", "user:manage"]

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  user: [],
  moderator: MODERATOR_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
}

export function can(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export const STATUS_TRANSITIONS: Record<Status, Status[]> = {
  open: ["in_progress"],
  in_progress: ["resolved"],
  resolved: ["closed"],
  closed: [],
}

export function canTransition(from: Status, to: Status): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false
}
