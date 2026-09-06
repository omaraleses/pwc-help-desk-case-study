# PwC Help Desk, Case Study Implementation

Role-based support helpdesk. Employees raise tickets and follow their progress,
moderators work the queue (assign, prioritize, move status), and admins manage
accounts and categories.

Stack: Next.js 16 (App Router, React 19), TypeScript, Tailwind CSS 4, shadcn/ui
(Base UI), TanStack Query, TanStack Table, TanStack Form, better-auth with the admin
plugin, PostgreSQL 17 (Docker), Drizzle ORM.

## Prerequisites

- Node.js 20+ and npm (or Bun)
- Docker (for PostgreSQL)

## Setup

```bash
git clone https://github.com/omaraleses/pwc-help-desk-case-study
cd pwc-help-desk-case-study
npm install
```

## Environment variables

Create a `.env` file in the project root. Start from the template:

```bash
cp .env.example .env
```

Then open `.env` and set the three variables. The first two already match the local
Docker database and can be left as-is; only `BETTER_AUTH_SECRET` must be changed to a
random string.

```bash
# PostgreSQL connection (matches docker-compose.yml)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/helpdesk

# Public URL of the app
BETTER_AUTH_URL=http://localhost:3000

# Random 32+ character secret. Generate one with:
#   openssl rand -base64 32
BETTER_AUTH_SECRET=replace-this-with-a-random-32-plus-char-string
```

Notes on each variable:

- `DATABASE_URL` must point at the running PostgreSQL instance. The default in
  `.env.example` works out of the box with the bundled `docker-compose.yml`.
- `BETTER_AUTH_URL` is the base URL the auth client uses; leave it at the localhost
  default for local development.
- `BETTER_AUTH_SECRET` is required by better-auth to sign cookies. Use any long random
  string; do not ship the placeholder value.

There is no `RESEND_API_KEY` requirement in this project, email is mocked (see
"Scope left out").

## Database and seed

```bash
docker compose up -d      # start PostgreSQL
npm run db:push           # create the schema
npm run db:seed           # wipe and insert demo data
```

The seed script resets the database and creates 4 users, 3 categories, 14 tickets and
9 comments, then prints the credentials.

## Run

```bash
npm run dev
```

Open http://localhost:3000.

## Seeded credentials

All seeded accounts use the password `Password123!`. One per role:

| Email | Role | Dashboard |
|---|---|---|
| admin@example.com | admin | queue, users, categories |
| sam@example.com | moderator | ticket queue |
| jordan@example.com | user | my tickets |

A second moderator, `priya@example.com`, is also seeded but reserved for a future AI
agent integration (see "Scope left out").

New signups are created deactivated. They see a "pending activation" screen until an
admin activates the account from the Users page.

## API overview

All routes live under `/app/api` and authorize from the server session, never from the
request body. Errors use one shape: `{ "error": { "code", "message" } }`. Pagination,
filtering and sorting always run in SQL.

| Method | Route | Access | Notes |
|---|---|---|---|
| GET | /api/tickets | role scoped | users see own, staff see all. Query: q, status, priority, categoryId, assigneeId, page, pageSize, sort |
| GET | /api/tickets/summary | any | dashboard counts |
| POST | /api/tickets | any active user | returns ticket number |
| GET | /api/tickets/:id | requester or staff | 403 on cross access |
| PUT | /api/tickets/:id | per field | transition rules, assign, priority. Users can only close their own resolved ticket |
| DELETE | /api/tickets/:id | admin | soft delete |
| GET/POST | /api/tickets/:id/comments | requester or staff | flat comment thread |
| GET | /api/categories | any authenticated | |
| POST/PUT/DELETE | /api/categories/:id | admin | |
| GET | /api/users | admin | paginated, q + role filter, sort |
| PUT | /api/users/:id | admin | `{ role }` or `{ isActive }` |

## State management

The app uses TanStack libraries for client state, chosen because each maps to one
well-scoped concern and stays predictable at small, production-like scale:

- TanStack Query for all server state. Requests are cached, deduplicated and
  invalidated by key, which avoids prop drilling and hand-rolled fetch state. Mutations
  use optimistic updates with rollback so the UI stays snappy, then revalidate.
- TanStack Table for the grids, driving server-side pagination, sorting and filtering
  with zero client-side memory growth.
- TanStack Form + Zod for inputs, sharing the same schemas the API validates with.
- better-auth for session state and role lookups; authorization is always re-checked
  server-side on every route, never trusted from the client.

This keeps server state, form state and auth concerns separate rather than pushing
everything into one global store, which is the trade-off that scales best here.

## Scope left out (conscious trade-offs)

- No PATCH endpoints. Updates go through PUT only, a deliberate consistency choice.
- Email is mocked (logs to console). Real delivery was out of scope for the MVP and
  would need a provider such as Resend.
- No AI agent integration. `priya@example.com` is seeded as the future agent account.
- No file attachments, ticket reopening, or daily admin summary email.

These were left out on purpose to keep the submission focused and production-minded at
a small scale rather than half-built features.

## Fresh clone test

From a clean clone:

```bash
docker compose up -d
npm install
cp .env.example .env   # then set BETTER_AUTH_SECRET
npm run db:push
npm run db:seed
npm run dev
```

Then log in as each role and verify:

- jordan (user): summary cards, my tickets table with pagination, raise a ticket and
  get the ticket number back, open the detail dialog and add a comment, close a
  resolved ticket.
- sam (moderator): ticket queue with server-side filters and sort, change priority,
  move status, assign or unassign, open any ticket detail.
- admin@example.com (admin): everything the moderator sees plus delete, the Users page
  (activate or deactivate accounts, change roles, search and sort) and the Users nav
  link in the navbar.
