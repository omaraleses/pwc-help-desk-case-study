import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { TicketsTable } from "@/app/(protected)/tickets/components/table"
import { auth } from "@/lib/auth"
import type { Role } from "@/lib/types"

export default async function TicketsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const role = (session.user.role ?? "user") as Role
  const canManage = role === "admin" || role === "moderator"

  return <TicketsTable canManage={canManage} canDelete={role === "admin"} />
}
