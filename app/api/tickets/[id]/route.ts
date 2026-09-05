import { eq } from "drizzle-orm"
import { NextResponse, type NextRequest } from "next/server"
import { db } from "@/db"
import { user } from "@/auth-schema"
import {
  badRequest,
  conflict,
  errorResponse,
  forbidden,
} from "@/lib/api-error"
import { sendTicketResolved } from "@/lib/email"
import { tickets } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import {
  assertVisibleTicket,
  loadTicket,
  parseTicketId,
} from "@/lib/ticket-access"
import { can, canTransition } from "@/lib/permissions"
import { formatTicketNo } from "@/lib/types"
import { ticketPatchSchema } from "@/lib/validations/ticket"

type TicketDetail = Awaited<ReturnType<typeof loadTicket>>

function serialize(ticket: TicketDetail) {
  return {
    id: ticket.id,
    ticketNo: formatTicketNo(ticket.id),
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    deletedAt: ticket.deletedAt,
    category: { id: ticket.category.id, name: ticket.category.name },
    requester: { id: ticket.requester.id, name: ticket.requester.name },
    assignee: ticket.assignee
      ? { id: ticket.assignee.id, name: ticket.assignee.name }
      : null,
    comments: ticket.comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      author: { id: comment.author.id, name: comment.author.name },
    })),
  }
}

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/tickets/[id]">,
) {
  try {
    const { session, role } = await getSession()
    const ticket = await loadTicket(parseTicketId((await ctx.params).id))
    assertVisibleTicket(ticket, session, role)
    return NextResponse.json(serialize(ticket))
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/tickets/[id]">,
) {
  try {
    const { session, role } = await getSession()
    const ticket = await loadTicket(parseTicketId((await ctx.params).id))
    assertVisibleTicket(ticket, session, role)
    if (ticket.deletedAt) throw conflict("Ticket is deleted")

    const input = ticketPatchSchema.parse(await request.json())
    if (Object.keys(input).length === 0) {
      throw badRequest("No updatable fields provided")
    }

    const isRequester = ticket.requesterId === session.user.id

    if (input.status !== undefined && input.status !== ticket.status) {
      const isClose = ticket.status === "resolved" && input.status === "closed"
      if (isClose) {
        if (!isRequester && role !== "admin") {
          throw forbidden(
            "Only the requester or an admin can close a resolved ticket",
          )
        }
      } else {
        if (!can(role, "ticket:status")) {
          throw forbidden("You cannot change ticket status")
        }
        if (!canTransition(ticket.status, input.status)) {
          throw badRequest(
            `Cannot transition ticket from ${ticket.status} to ${input.status}`,
          )
        }
      }
    }

    if (input.priority !== undefined && !can(role, "ticket:priority")) {
      throw forbidden("You cannot change ticket priority")
    }

    if (input.assigneeId !== undefined) {
      if (!can(role, "ticket:assign")) {
        throw forbidden("You cannot assign tickets")
      }
      if (input.assigneeId !== null) {
        const assignee = await db.query.user.findFirst({
          where: eq(user.id, input.assigneeId),
        })
        if (
          !assignee ||
          !assignee.isActive ||
          !["moderator", "admin"].includes(assignee.role ?? "user")
        ) {
          throw badRequest("Assignee must be an active moderator or admin")
        }
      }
    }

    await db
      .update(tickets)
      .set({
        ...(input.status !== undefined && { status: input.status }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.assigneeId !== undefined && { assigneeId: input.assigneeId }),
      })
      .where(eq(tickets.id, ticket.id))

    if (input.status === "resolved" && ticket.status !== "resolved") {
      await sendTicketResolved({
        ticketId: ticket.id,
        subject: ticket.subject,
        requesterEmail: ticket.requester.email,
        resolvedByEmail: session.user.email,
      })
    }

    return NextResponse.json(serialize(await loadTicket(ticket.id)))
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/tickets/[id]">,
) {
  try {
    const { session, role } = await getSession()
    if (!can(role, "ticket:delete")) {
      throw forbidden("Only an admin can delete tickets")
    }
    const ticket = await loadTicket(parseTicketId((await ctx.params).id))
    assertVisibleTicket(ticket, session, role)
    if (ticket.deletedAt) throw conflict("Ticket is already deleted")

    const deletedAt = new Date()
    await db
      .update(tickets)
      .set({ deletedAt })
      .where(eq(tickets.id, ticket.id))

    return NextResponse.json({
      id: ticket.id,
      ticketNo: formatTicketNo(ticket.id),
      deletedAt,
    })
  } catch (error) {
    return errorResponse(error)
  }
}
