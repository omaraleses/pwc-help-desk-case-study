import { eq } from "drizzle-orm"
import { NextResponse, type NextRequest } from "next/server"
import { db } from "@/db"
import { conflict, errorResponse, forbidden } from "@/lib/api-error"
import { categories, tickets } from "@/lib/db/schema"
import { can } from "@/lib/permissions"
import { getSession } from "@/lib/session"
import { categoryCreateSchema } from "@/lib/validations/user"

export async function GET() {
  try {
    await getSession()

    const rows = await db.query.categories.findMany({
      orderBy: (category, { asc }) => [asc(category.name)],
    })

    const data = await Promise.all(
      rows.map(async (category) => ({
        id: category.id,
        name: category.name,
        createdAt: category.createdAt,
        ticketCount: await db.$count(tickets, eq(tickets.categoryId, category.id)),
      })),
    )

    return NextResponse.json({ data })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { role } = await getSession()
    if (!can(role, "category:manage")) {
      throw forbidden("Only an admin can manage categories")
    }

    const input = categoryCreateSchema.parse(await request.json())

    const existing = await db.query.categories.findFirst({
      where: eq(categories.name, input.name),
    })
    if (existing) throw conflict("A category with this name already exists")

    const [created] = await db
      .insert(categories)
      .values({ name: input.name })
      .returning()

    return NextResponse.json(
      { id: created.id, name: created.name },
      { status: 201 },
    )
  } catch (error) {
    return errorResponse(error)
  }
}
