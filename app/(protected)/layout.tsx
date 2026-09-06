import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { NavLinks } from "@/app/(protected)/nav-links"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { Badge } from "@/components/ui/badge"
import { auth } from "@/lib/auth"
import { ROLE_LABELS, type Role } from "@/lib/types"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const role = (session.user.role ?? "user") as Role

  return (
    <div className="bg-background flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-6 px-4">
          <div className="flex items-center gap-4">
            <span className="font-heading font-semibold">Help Desk</span>
            <NavLinks isAdmin={role === "admin"} />
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline">{ROLE_LABELS[role] ?? "User"}</Badge>
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {session.user.name}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
