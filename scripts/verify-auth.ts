import { auth } from "@/lib/auth"
import { db } from "@/db"
import { account, session, user } from "@/auth-schema"
import { eq } from "drizzle-orm"

async function main() {
  let pass = 0
  let fail = 0
  const check = (name: string, ok: boolean, detail?: unknown) => {
    if (ok) {
      pass++
      console.log(`PASS ${name}`)
    } else {
      fail++
      console.log(`FAIL ${name}`, detail ?? "")
    }
  }

  console.log("1) Active user signs in")
  try {
    const res = await auth.api.signInEmail({
      body: { email: "jordan@example.com", password: "Password123!" },
      headers: new Headers(),
    })
    const role = (res.user as Record<string, unknown>).role
    const isActive = (res.user as Record<string, unknown>).isActive
    check("sign-in succeeds", !!res.user, res)
    check("role exposed on session user", role === "user", role)
    check("isActive exposed on session user", isActive === true, isActive)
  } catch (error) {
    check("sign-in succeeds", false, error)
  }

  console.log("2) Admin signs in")
  try {
    const res = await auth.api.signInEmail({
      body: { email: "admin@example.com", password: "Password123!" },
      headers: new Headers(),
    })
    check("admin sign-in succeeds", !!res.user, res)
  } catch (error) {
    check("admin sign-in succeeds", false, error)
  }

  console.log("3) Wrong password rejected")
  try {
    await auth.api.signInEmail({
      body: { email: "jordan@example.com", password: "wrong-password" },
      headers: new Headers(),
    })
    check("wrong password rejected", false)
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode
    check("wrong password rejected", status === 401 || status === 400, status)
  }

  console.log("4) Fresh signup is gated (isActive false)")
  const pendingEmail = "pending-verify@example.com"
  try {
    const res = await auth.api.signUpEmail({
      body: { name: "Pending Verify", email: pendingEmail, password: "Password123!" },
      headers: new Headers(),
    })
    console.log("   signUpEmail returned:", JSON.stringify(res).slice(0, 200))
  } catch (error) {
    console.log(
      "   signUpEmail threw:",
      JSON.stringify((error as { statusCode?: number; body?: unknown }).statusCode),
    )
  }

  const pendingUser = await db.query.user.findFirst({
    where: eq(user.email, pendingEmail),
  })
  check("signup created the user row", !!pendingUser)
  check("signup left user inactive", pendingUser?.isActive === false)
  const pendingSessions = pendingUser
    ? await db.select().from(session).where(eq(session.userId, pendingUser.id))
    : []
  check("signup did not create a session", pendingSessions.length === 0)

  console.log("5) Inactive user cannot sign in")
  try {
    await auth.api.signInEmail({
      body: { email: pendingEmail, password: "Password123!" },
      headers: new Headers(),
    })
    check("inactive sign-in blocked", false)
  } catch (error) {
    const err = error as { statusCode?: number; body?: { message?: string } }
    check(
      "inactive sign-in blocked with 403 pending message",
      err.statusCode === 403 && /pending activation/i.test(err.body?.message ?? ""),
      { status: err.statusCode, message: err.body?.message },
    )
  }

  console.log("6) Cleanup")
  if (pendingUser) {
    await db.delete(session).where(eq(session.userId, pendingUser.id))
    await db.delete(account).where(eq(account.userId, pendingUser.id))
    await db.delete(user).where(eq(user.id, pendingUser.id))
  }
  check("pending test user removed", true)

  console.log(`\nResult: ${pass} passed, ${fail} failed`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
