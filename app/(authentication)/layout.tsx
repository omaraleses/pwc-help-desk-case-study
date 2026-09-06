import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { BfcacheReload } from "@/components/bfcache-reload"
import { auth } from "@/lib/auth"

export default async function AuthenticationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect("/tickets")

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <BfcacheReload />
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-heading text-xl font-semibold">Help Desk</h1>
          <p className="text-muted-foreground text-sm">
            Internal support tickets for every team.
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
