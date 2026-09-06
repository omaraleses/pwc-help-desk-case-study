import { and, eq, ne } from "drizzle-orm"
import { NextResponse, type NextRequest } from "next/server"
import { db } from "@/db"
import {
  badRequest,
  conflict,
  errorResponse,
  forbidden,
  notFound,
} from "@/lib/api-error"
import { categories, tickets } from "@/lib/db/schema"
import { can } from "@/lib/permissions"
import { getSession } from "@/lib/session"
import { categoryPatchSchema } from "@/lib/validations/user"

async function assertAdmin() {
  const { role } = await getSession()
  if (!can(role, "category:manage")) {
    throw forbidden("Only an admin can manage categories")
  }
}

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/categories/[id]">,
) {
  try {
    await assertAdmin()
    const id = Number((await ctx.params).id)
    if (!Number.isInteger(id) || id < 1) throw badRequest("Invalid category id")

    const input = categoryPatchSchema.parse(await request.json())

    const category = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    })
    if (!category) throw notFound("Category not found")

    const duplicate = await db.query.categories.findFirst({
      where: and(eq(categories.name, input.name), ne(categories.id, id)),
    })
    if (duplicate) throw conflict("A category with this name already exists")

    const [updated] = await db
      .update(categories)
      .set({ name: input.name })
      .where(eq(categories.id, id))
      .returning()

    return NextResponse.json({ id: updated.id, name: updated.name })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/categories/[id]">,
) {
  try {
    await assertAdmin()
    const id = Number((await ctx.params).id)
    if (!Number.isInteger(id) || id < 1) throw badRequest("Invalid category id")

    const category = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    })
    if (!category) throw notFound("Category not found")

    const ticketCount = await db.$count(tickets, eq(tickets.categoryId, id))
    if (ticketCount > 0) {
      throw conflict(
        `Category is used by ${ticketCount} ticket${ticketCount === 1 ? "" : "s"} and cannot be deleted`,
      )
    }

    await db.delete(categories).where(eq(categories.id, id))
    return NextResponse.json({ id, deleted: true })
  } catch (error) {
    return errorResponse(error)
  }
}
