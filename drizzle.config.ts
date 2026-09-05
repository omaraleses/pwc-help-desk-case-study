import "dotenv/config"
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  out: "./drizzle",
  schema: [
    "./auth-schema.ts",
    "./lib/db/enums.ts",
    "./lib/db/categories.ts",
    "./lib/db/tickets.ts",
    "./lib/db/tickets-comments.ts",
  ],
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
