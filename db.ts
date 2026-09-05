import { config } from "dotenv"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as authSchema from "./auth-schema"
import { categories, ticketComments, tickets, ticketsRelations, ticketCommentsRelations } from "./lib/db/schema"

config({ path: ".env" })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const db = drizzle({
  client: pool,
  schema: {
    user: authSchema.user,
    session: authSchema.session,
    account: authSchema.account,
    verification: authSchema.verification,
    categories,
    tickets,
    ticketComments,
    ticketsRelations,
    ticketCommentsRelations,
  },
})
