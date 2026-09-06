# PwC Help Desk, Case Study Implementation

Role-based support helpdesk for the PwC case study. Employees raise tickets and follow
their progress, moderators work the queue (assign, prioritize, move status), and admins
manage accounts and categories.

Stack: Next.js 16 (App Router, React 19), TypeScript, Tailwind CSS 4, shadcn/ui
(Base UI), TanStack Query, TanStack Table, TanStack Form, better-auth with the admin
plugin, PostgreSQL 17, Drizzle ORM.

## Install

```bash
git clone <repo>
cd pwc-help-desk-case-study
npm install
```

## Configure and run

Step 1, environment. Copy `.env.example` to `.env` and fill in:

| Variable | Local value | Notes |
|---|---|---|
| DATABASE_URL | postgres://postgres:postgres@localhost:5432/helpdesk | matches docker-compose.yml |
| BETTER_AUTH_URL | http://localhost:3000 | |
| BETTER_AUTH_SECRET | any random 32+ char string | generate with `openssl rand -base64 32` |

Step 2, database:

```bash
docker compose up -d
npm run db:push     # or: npm run db:generate && npm run db:migrate
npm run db:seed
```

Step 3, run:

```bash
npm run dev
```

Step 4, seeded credentials (all use the password `Password123!`):

| Email | Role |
|---|---|
| admin@example.com | admin |
| sam@example.com | moderator |
| priya@example.com | moderator |
| jordan@example.com | user |

New signups start deactivated and get a "pending activation" screen until an admin
activates the account from the Users page.

## API overview

All routes are under `/app/api` and authorize from the server session, never from the
request body. Errors use a consistent shape: `{ "error": { "code", "message" } }`.
Pagination, filtering and sorting always run in SQL.

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

A note on PATCH: this project does not expose PATCH endpoints. Updates go through PUT,
a deliberate personal preference kept consistent across all resources.

## Fresh clone test

From a clean clone:

```bash
docker compose up -d
npm install
# configure .env as above
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
- admin@example.com (admin): everything the moderator sees plus delete, the Users
  page (activate or deactivate accounts, change roles, search and sort) and the
  Users nav link in the navbar.
