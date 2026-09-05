import { and, eq, isNull, sql, type SQL } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { errorResponse } from "@/lib/api-error"
import { tickets } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import type { TicketStatus } from "@/lib/db/enums"

export async function GET() {
  try {
    const { session, role } = await getSession()

    const conditions: SQL[] = [isNull(tickets.deletedAt)]
    if (role === "user") {
      conditions.push(eq(tickets.requesterId, session.user.id))
    }
    const where = and(...conditions)

    const rows = await db
      .select({ status: tickets.status, count: sql<number>`count(*)::int` })
      .from(tickets)
      .where(where)
      .groupBy(tickets.status)

    const counts: Record<TicketStatus, number> = {
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
    }
    for (const row of rows) {
      counts[row.status] = row.count
    }

    return NextResponse.json({
      open: counts.open,
      inProgress: counts.in_progress,
      resolved: counts.resolved,
      closed: counts.closed,
      total: counts.open + counts.in_progress + counts.resolved + counts.closed,
    })
  } catch (error) {
    return errorResponse(error)
  }
}
