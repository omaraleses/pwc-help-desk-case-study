import { db } from "@/db"
import { account, session, user, verification } from "@/auth-schema"
import { eq } from "drizzle-orm"
import { APIError } from "better-auth/api"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin } from "better-auth/plugins"

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      isActive: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (newSession) => {
          if (process.env.SEEDING === "true") return
          const accountHolder = await db.query.user.findFirst({
            where: eq(user.id, newSession.userId),
          })
          if (!accountHolder || !accountHolder.isActive) return false
        },
      },
    },
  },
  hooks: {
    before: async (ctx) => {
      if (process.env.SEEDING === "true") return
      const { path, body } = ctx as unknown as {
        path?: string
        body?: { email?: string }
      }
      if (path !== "/sign-in/email") return
      if (!body?.email) return
      const found = await db.query.user.findFirst({
        where: eq(user.email, body.email),
      })
      if (found && !found.isActive) {
        throw new APIError(403, {
          message: "Your account is pending activation by an administrator.",
        })
      }
    },
  },
  plugins: [admin()],
})
