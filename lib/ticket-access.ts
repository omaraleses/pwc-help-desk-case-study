import { eq } from "drizzle-orm"
import { db } from "@/db"
import { tickets, type SelectTicket } from "@/lib/db/schema"
import { badRequest, forbidden, notFound } from "@/lib/api-error"
import type { Role } from "@/lib/types"

export async function loadTicket(id: number) {
  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, id),
    with: {
      requester: true,
      assignee: true,
      category: true,
      comments: {
        orderBy: (comment, { asc }) => [asc(comment.createdAt)],
        with: { author: true },
      },
    },
  })
  if (!ticket) throw notFound("Ticket not found")
  return ticket
}

export function assertVisibleTicket(
  ticket: SelectTicket,
  session: { user: { id: string } },
  role: Role,
) {
  if (ticket.deletedAt && role !== "admin") {
    throw notFound("Ticket not found")
  }
  if (role === "user" && ticket.requesterId !== session.user.id) {
    throw forbidden("You cannot access another user's ticket")
  }
}

export function parseTicketId(raw: string): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id < 1) {
    throw badRequest("Invalid ticket id")
  }
  return id
}
