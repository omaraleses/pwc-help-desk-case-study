import { db } from "@/db"
import { badRequest, errorResponse } from "@/lib/api-error"
import { categories, tickets } from "@/lib/db/schema"
import { sendTicketCreated } from "@/lib/email"
import { getSession } from "@/lib/session"
import { formatTicketNo } from "@/lib/types"
import {
  TICKET_SORTS,
  ticketCreateSchema,
  ticketQuerySchema,
} from "@/lib/validations/ticket"
import { and, asc, desc, eq, ilike, isNull, type SQL } from "drizzle-orm"
import { NextResponse, type NextRequest } from "next/server"

type SortKey = (typeof TICKET_SORTS)[number]

const SORT_ORDER: Record<SortKey, SQL[]> = {
  createdAt_desc: [desc(tickets.createdAt), desc(tickets.id)],
  createdAt_asc: [asc(tickets.createdAt), asc(tickets.id)],
  updatedAt_desc: [desc(tickets.updatedAt), desc(tickets.id)],
  updatedAt_asc: [asc(tickets.updatedAt), asc(tickets.id)],
  priority_desc: [desc(tickets.priority), desc(tickets.id)],
  priority_asc: [asc(tickets.priority), asc(tickets.id)],
}

export async function GET(request: NextRequest) {
  try {
    const { session, role } = await getSession()

    const query = ticketQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    )

    const conditions: SQL[] = []
    if (role !== "admin") {
      conditions.push(isNull(tickets.deletedAt))
    }
    if (role === "user") {
      conditions.push(eq(tickets.requesterId, session.user.id))
    } else if (query.requesterId) {
      conditions.push(eq(tickets.requesterId, query.requesterId))
    }
    if (query.status) conditions.push(eq(tickets.status, query.status))
    if (query.priority) conditions.push(eq(tickets.priority, query.priority))
    if (query.categoryId) {
      conditions.push(eq(tickets.categoryId, query.categoryId))
    }
    if (query.assigneeId) {
      conditions.push(eq(tickets.assigneeId, query.assigneeId))
    }
    if (query.q) conditions.push(ilike(tickets.subject, `%${query.q}%`))

    const where = conditions.length ? and(...conditions) : undefined

    const [rows, totalCount] = await Promise.all([
      db.query.tickets.findMany({
        where,
        orderBy: SORT_ORDER[query.sort],
        limit: query.pageSize,
        offset: (query.page - 1) * query.pageSize,
        with: { requester: true, assignee: true, category: true },
      }),
      db.$count(tickets, where),
    ])

    console.log("ROWS::", rows)

    return NextResponse.json({
      data: rows.map((ticket) => ({
        id: ticket.id,
        ticketNo: formatTicketNo(ticket.id),
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        deletedAt: ticket.deletedAt,
        category: {
          id: ticket.category.id,
          name: ticket.category.name,
        },
        requester: {
          id: ticket.requester.id,
          name: ticket.requester.name,
        },
        assignee: ticket.assignee
          ? { id: ticket.assignee.id, name: ticket.assignee.name }
          : null,
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / query.pageSize),
      },
    })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session } = await getSession()

    const input = ticketCreateSchema.parse(await request.json())

    const category = await db.query.categories.findFirst({
      where: eq(categories.id, input.categoryId),
    })
    if (!category) throw badRequest("Selected category does not exist")

    const [created] = await db
      .insert(tickets)
      .values({
        subject: input.subject,
        description: input.description,
        status: "open",
        priority: input.priority,
        categoryId: input.categoryId,
        requesterId: session.user.id,
      })
      .returning()

    await sendTicketCreated({
      ticketId: created.id,
      subject: created.subject,
      requesterEmail: session.user.email,
    })

    return NextResponse.json(
      { id: created.id, ticketNo: formatTicketNo(created.id) },
      { status: 201 }
    )
  } catch (error) {
    return errorResponse(error)
  }
}
