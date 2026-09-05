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

export default async function CategoriesPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")
  if (session.user.role !== "admin") redirect("/tickets")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Categories</h1>
        <p className="text-muted-foreground text-sm">
          Ticket categories available to requesters.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Category management</CardTitle>
          <CardDescription>
            Placeholder. Phase 10 wires this to /api/categories CRUD.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
            <li>List, create, rename and delete categories</li>
            <li>Delete blocked with 409 when tickets exist</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
