import { headers } from "next/headers"
import { redirect } from "next/navigation"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { auth } from "@/lib/auth"

export default async function UsersPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")
  if (session.user.role !== "admin") redirect("/tickets")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Accounts</h1>
        <p className="text-muted-foreground text-sm">
          Activate, deactivate and manage roles.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Placeholder. Phase 10 wires this to GET /api/users and PATCH
            /api/users/:id.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
            <li>All accounts with inactive badge</li>
            <li>Activate check action for pending accounts</li>
            <li>Role change and deactivate actions</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
