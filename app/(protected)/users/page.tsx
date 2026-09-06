import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { UsersTable } from "@/app/(protected)/users/components/table"
import { auth } from "@/lib/auth"

export default async function UsersPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")
  if (session.user.role !== "admin") redirect("/tickets")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Accounts</h1>
        <p className="text-sm text-muted-foreground">
          Activate, deactivate and manage roles.
        </p>
      </div>
      <UsersTable currentUserId={session.user.id} />
    </div>
  )
}
