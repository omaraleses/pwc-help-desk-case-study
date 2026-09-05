import { user } from "@/auth-schema"
import { relations } from "drizzle-orm"
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core"
import { tickets } from "./tickets"

export const ticketComments = pgTable("ticket_comments", {
  id: serial("id").primaryKey(),

  ticketId: integer("ticket_id")
    .notNull()
    .references(() => tickets.id, {
      onDelete: "cascade",
    }),

  authorId: text("author_id")
    .notNull()
    .references(() => user.id),

  body: text("body").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const ticketCommentsRelations = relations(ticketComments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketComments.ticketId],
    references: [tickets.id],
  }),
  author: one(user, {
    fields: [ticketComments.authorId],
    references: [user.id],
  }),
}))

export type InsertTicketComment = typeof ticketComments.$inferInsert
export type SelectTicketComment = typeof ticketComments.$inferSelect
