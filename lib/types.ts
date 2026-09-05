import type { TicketPriority, TicketStatus, UserRole } from "@/lib/db/enums"

export type Role = UserRole
export type Status = TicketStatus
export type Priority = TicketPriority

export type Pagination = {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export type Paginated<T> = {
  data: T[]
  pagination: Pagination
}

export type ApiErrorBody = {
  error: {
    code: string
    message: string
    details?: { path: string; message: string }[]
  }
}

export const ROLE_LABELS: Record<Role, string> = {
  user: "User",
  moderator: "Moderator",
  admin: "Admin",
}

export function formatTicketNo(id: number): string {
  return `#${String(id).padStart(5, "0")}`
}
