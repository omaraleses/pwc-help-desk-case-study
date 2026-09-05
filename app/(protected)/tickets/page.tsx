import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { AdminTicketsPage } from "@/components/tickets/admin-tickets-page"
import { ClientTicketsPage } from "@/components/tickets/client-tickets-page"
import { ModeratorTicketsPage } from "@/components/tickets/moderator-tickets-page"
import { auth } from "@/lib/auth"
import type { Role } from "@/lib/types"

export default async function TicketsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const role = (session.user.role ?? "user") as Role

  switch (role) {
    case "admin":
      return <AdminTicketsPage />
    case "moderator":
      return <ModeratorTicketsPage />
    case "user":
      return <ClientTicketsPage />
    default:
      notFound()
  }
}
