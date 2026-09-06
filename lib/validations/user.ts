import { z } from "zod"

export const categoryCreateSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name must be at most 60 characters"),
})

export const categoryPatchSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name must be at most 60 characters"),
})

export const userPatchSchema = z
  .object({
    role: z.enum(["user", "moderator", "admin"]),
    isActive: z.boolean(),
  })
  .strict()
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update",
  })

export const userSortEnum = z.enum([
  "email_asc",
  "email_desc",
  "name_asc",
  "name_desc",
  "role_asc",
  "role_desc",
  "createdAt_asc",
  "createdAt_desc",
])

export const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  q: z.string().max(100).optional(),
  role: z.enum(["user", "moderator", "admin"]).optional(),
  staff: z.literal("true").optional(),
  sort: userSortEnum.default("email_asc"),
})

export type UserQueryInput = z.infer<typeof userQuerySchema>
export type UserSort = z.infer<typeof userSortEnum>
export type UserPatchInput = z.input<typeof userPatchSchema>
