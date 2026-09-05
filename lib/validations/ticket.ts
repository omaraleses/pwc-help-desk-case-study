import { z } from "zod"

export const ticketCreateSchema = z.object({
  subject: z
    .string()
    .min(5, "Subject must be at least 5 characters")
    .max(120, "Subject must be at most 120 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be at most 2000 characters"),
  categoryId: z.coerce.number().int().positive("Pick a category"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
})

export const ticketPatchSchema = z
  .object({
    status: z.enum(["open", "in_progress", "resolved", "closed"]),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    assigneeId: z.string().nullable(),
  })
  .strict()
  .partial()

export const commentCreateSchema = z.object({
  body: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment must be at most 2000 characters"),
})

export const TICKET_SORTS = [
  "createdAt_desc",
  "createdAt_asc",
  "updatedAt_desc",
  "updatedAt_asc",
  "priority_desc",
  "priority_asc",
] as const

export const ticketQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  assigneeId: z.string().optional(),
  requesterId: z.string().optional(),
  q: z.string().max(100).optional(),
  sort: z.enum(TICKET_SORTS).default("createdAt_desc"),
})

export type TicketCreateInput = z.infer<typeof ticketCreateSchema>
export type TicketPatchInput = z.infer<typeof ticketPatchSchema>
export type TicketQueryInput = z.infer<typeof ticketQuerySchema>
