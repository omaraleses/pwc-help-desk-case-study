import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { unauthorized } from "@/lib/api-error"
import type { Role } from "@/lib/types"

export async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw unauthorized("Not authenticated")
  const role = (session.user.role ?? "user") as Role
  return { session, role }
}
