import { and, asc, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm"
import { NextResponse, type NextRequest } from "next/server"
import { db } from "@/db"
import { user } from "@/auth-schema"
import { errorResponse, forbidden } from "@/lib/api-error"
import { can } from "@/lib/permissions"
import { getSession } from "@/lib/session"
import { userQuerySchema } from "@/lib/validations/user"

export async function GET(request: NextRequest) {
  try {
    const { role } = await getSession()
    const query = userQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    )

    const sortMap = {
      email_asc: [asc(user.email)],
      email_desc: [desc(user.email)],
      name_asc: [asc(user.name)],
      name_desc: [desc(user.name)],
      role_asc: [asc(user.role)],
      role_desc: [desc(user.role)],
      createdAt_asc: [asc(user.createdAt)],
      createdAt_desc: [desc(user.createdAt)],
    } satisfies Record<string, SQL[]>
    const orderBy = [...sortMap[query.sort], asc(user.id)]

    if (query.staff === "true") {
      if (!can(role, "ticket:assign")) {
        throw forbidden("Only staff can list the assignee roster")
      }
      const staff = await db.query.user.findMany({
        where: and(
          inArray(user.role, ["moderator", "admin"]),
          eq(user.isActive, true),
        ),
        orderBy: [asc(user.name)],
      })
      return NextResponse.json({
        data: staff.map((member) => ({
          id: member.id,
          name: member.name,
          role: member.role ?? "user",
        })),
      })
    }

    if (!can(role, "user:manage")) {
      throw forbidden("Only an admin can list users")
    }

    const conditions: SQL[] = []
    if (query.q) {
      const pattern = `%${query.q}%`
      conditions.push(
        or(ilike(user.name, pattern), ilike(user.email, pattern))!,
      )
    }
    if (query.role) {
      conditions.push(eq(user.role, query.role))
    }
    const where = conditions.length ? and(...conditions) : undefined

    const [rows, totalCount] = await Promise.all([
      db.query.user.findMany({
        where,
        orderBy,
        limit: query.pageSize,
        offset: (query.page - 1) * query.pageSize,
      }),
      db.$count(user, where),
    ])

    return NextResponse.json({
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role ?? "user",
        isActive: row.isActive,
        createdAt: row.createdAt,
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
