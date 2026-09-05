import { user } from "@/auth-schema"
import { relations } from "drizzle-orm"
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core"
import { categories } from "./categories"
import { ticketComments } from "./tickets-comments"
import { ticketPriorityEnum, ticketStatusEnum } from "./enums"

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),

  subject: text("subject").notNull(),
  description: text("description").notNull(),

  status: ticketStatusEnum("status").default("open").notNull(),

  priority: ticketPriorityEnum("priority").default("medium").notNull(),

  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),

  requesterId: text("requester_id")
    .notNull()
    .references(() => user.id),

  assigneeId: text("assignee_id").references(() => user.id),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),

  deletedAt: timestamp("deleted_at", { withTimezone: true }),
})

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  category: one(categories, {
    fields: [tickets.categoryId],
    references: [categories.id],
  }),
  requester: one(user, {
    fields: [tickets.requesterId],
    references: [user.id],
  }),
  assignee: one(user, {
    fields: [tickets.assigneeId],
    references: [user.id],
  }),
  comments: many(ticketComments),
}))

export type InsertTicket = typeof tickets.$inferInsert
export type SelectTicket = typeof tickets.$inferSelect
