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

export const STATUS_LABELS: Record<Status, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
}

export const SORT_LABELS: Record<string, string> = {
  createdAt_desc: "Newest first",
  createdAt_asc: "Oldest first",
  updatedAt_desc: "Recently updated",
  updatedAt_asc: "Least recently updated",
  priority_desc: "Priority high to low",
  priority_asc: "Priority low to high",
}

export function formatTicketNo(id: number): string {
  return `#${String(id).padStart(5, "0")}`
}
