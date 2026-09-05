import { pgEnum } from "drizzle-orm/pg-core"

export const userRoleEnum = pgEnum("user_role", ["user", "admin", "moderator"])

export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
])

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "medium",
  "high",
  "urgent",
])

export type UserRole = (typeof userRoleEnum.enumValues)[number]
export type TicketStatus = (typeof ticketStatusEnum.enumValues)[number]
export type TicketPriority = (typeof ticketPriorityEnum.enumValues)[number]
