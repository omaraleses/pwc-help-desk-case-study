import { NextResponse, type NextRequest } from "next/server"
import { db } from "@/db"
import { ticketComments } from "@/lib/db/schema"
import { conflict, errorResponse } from "@/lib/api-error"
import { getSession } from "@/lib/session"
import {
  assertVisibleTicket,
  loadTicket,
  parseTicketId,
} from "@/lib/ticket-access"
import { commentCreateSchema } from "@/lib/validations/ticket"

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/tickets/[id]/comments">,
) {
  try {
    const { session, role } = await getSession()
    const ticket = await loadTicket(parseTicketId((await ctx.params).id))
    assertVisibleTicket(ticket, session, role)

    return NextResponse.json({
      data: ticket.comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt,
        author: { id: comment.author.id, name: comment.author.name },
      })),
    })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/tickets/[id]/comments">,
) {
  try {
    const { session, role } = await getSession()
    const ticket = await loadTicket(parseTicketId((await ctx.params).id))
    assertVisibleTicket(ticket, session, role)
    if (ticket.deletedAt) throw conflict("Ticket is deleted")

    const input = commentCreateSchema.parse(await request.json())

    const [created] = await db
      .insert(ticketComments)
      .values({
        ticketId: ticket.id,
        authorId: session.user.id,
        body: input.body,
      })
      .returning()

    return NextResponse.json(
      {
        id: created.id,
        body: created.body,
        createdAt: created.createdAt,
        author: { id: session.user.id, name: session.user.name },
      },
      { status: 201 },
    )
  } catch (error) {
    return errorResponse(error)
  }
}
