import { eq } from "drizzle-orm"
import { NextResponse, type NextRequest } from "next/server"
import { db } from "@/db"
import { user } from "@/auth-schema"
import {
  errorResponse,
  forbidden,
  notFound,
} from "@/lib/api-error"
import { can } from "@/lib/permissions"
import { getSession } from "@/lib/session"
import { userPatchSchema } from "@/lib/validations/user"

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/users/[id]">,
) {
  try {
    const { session, role } = await getSession()
    if (!can(role, "user:manage")) {
      throw forbidden("Only an admin can manage users")
    }

    const { id } = await ctx.params
    const input = userPatchSchema.parse(await request.json())

    const target = await db.query.user.findFirst({ where: eq(user.id, id) })
    if (!target) throw notFound("User not found")

    const isSelf = target.id === session.user.id
    if (isSelf && input.role !== undefined && input.role !== "admin") {
      throw forbidden("You cannot demote yourself")
    }
    if (isSelf && input.isActive === false) {
      throw forbidden("You cannot deactivate yourself")
    }

    const [updated] = await db
      .update(user)
      .set({
        ...(input.role !== undefined && { role: input.role }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      })
      .where(eq(user.id, id))
      .returning()

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role ?? "user",
      isActive: updated.isActive,
      createdAt: updated.createdAt,
    })
  } catch (error) {
    return errorResponse(error)
  }
}
