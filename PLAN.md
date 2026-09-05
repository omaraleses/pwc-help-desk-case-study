# PwC Help Desk Case Study, Implementation Plan

Support helpdesk ticketing system. Users raise tickets, moderators work the queue, admins manage accounts and categories. Graded on: role-based dashboards, login with client state management, REST API design, server-side pagination and filtering, UX polish.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| UI | shadcn (base-ui), Tailwind CSS 4 |
| Server state | TanStack Query |
| Tables | TanStack Table (server-side pagination) |
| Forms | TanStack Form + Zod |
| Auth | better-auth, email/password + admin plugin |
| Authz | better-auth admin plugin access control + per-route checks |
| DB | PostgreSQL 17 (Docker), Drizzle ORM |
| Runtime | Bun |
| Email | Mock module (console log), Resend only if time remains |

## Roles and permission matrix

Enforced server-side on every API route. Client guards are UX only.

| Action | User | Moderator | Admin |
|---|---|---|---|
| View own tickets | yes | yes | yes |
| View all tickets | no | yes | yes |
| Create ticket | yes | yes | yes |
| Comment on own ticket | yes | yes | yes |
| Comment on any ticket | no | yes | yes |
| Assign ticket | no | yes | yes |
| Change priority | no | yes | yes |
| open -> in_progress, in_progress -> resolved | no | yes | yes |
| resolved -> closed | own ticket only | no | yes |
| Delete ticket | no | no | yes |
| Manage categories | no | no | yes |
| View /users list | no | no | yes |
| Activate / deactivate accounts, change roles | no | no | yes |

Cross-access attempts return 403, never silent filtering on detail routes. Status transitions outside the allowed set return 400.

## Authentication

- better-auth with email/password provider and the admin plugin. The organization plugin is deliberately not used, this is a flat three-role system.
- Open self-signup. Default role `user`, `isActive: false`.
- `isActive` gate lives in `databaseHooks.session.create.before`: load the user, return `false` to abort session creation when inactive. One hook covers sign-in and the auto-session after sign-up. Seed sets `SEEDING=true` to bypass the gate.
- `hooks.before` (single function, not an array, that is the 1.7 API) matches `/sign-in/email` and throws 403 "pending activation" for inactive accounts, so wrong password (401) and pending activation (403) are distinct errors.
- Signup UX: signUpEmail aborts at session creation after the user row is written. The form then attempts signIn to confirm, and shows the "Account created, pending activation" card when the 403 comes back. "User already exists" is matched separately.
- Seeded users are created active so reviewers log in immediately.
- Sessions are opaque cookies with DB-backed session rows, better-auth rotates them automatically. No JWT, no manual refresh token logic. Configured with `session: { expiresIn, updateAge }`.
- Permission statements (ticket:assign, ticket:status, ticket:priority, ticket:delete, category:manage, user:manage, comment:any) live in lib/permissions.ts with the role matrix, `can(role, permission)` and `canTransition(from, to)`. Every route handler calls them; the better-auth admin plugin supplies the role field and admin endpoints.

## Data model

| Table | Columns | Notes |
|---|---|---|
| user, session, account, verification | auth-schema.ts at root | user carries role, isActive, banned fields. CLI output completed by hand (updatedAt, ban fields) |
| categories | id serial pk, name unique | seeded: IT Hardware, IT Access & VPN, HR Payroll |
| tickets | id serial pk, subject, description, status enum, priority enum, categoryId fk, requesterId fk, assigneeId fk nullable, createdAt, updatedAt | id is the human reference, displayed padded to 5 digits through formatTicketNo (00001). requesterId and assigneeId are text (better-auth ids) |
| ticket_comments | id serial pk, ticketId fk cascade, authorId fk, body, createdAt | flat list, no replies |

Enums: status = open, in_progress, resolved, closed. Priority = low, medium, high, urgent. user_role enum exists in DB but roles are stored as text on user (better-auth admin plugin convention).

Relations are defined with drizzle `relations()` (tickets: category, requester, assignee, comments) so `db.query.tickets.findMany({ with: ... })` works for eager loading.

## API design

All routes under `/app/api`, route handlers with `auth.api.getSession({ headers })`. Consistent JSON error shape:

```json
{ "error": { "code": "FORBIDDEN", "message": "You cannot view another user's ticket" } }
```

Codes: BAD_REQUEST 400, UNAUTHORIZED 401, FORBIDDEN 403, NOT_FOUND 404, CONFLICT 409.

| Method | Route | Access | Notes |
|---|---|---|---|
| GET | /api/tickets | role scoped | users see own, moderators and admins see all. Query: status, priority, categoryId, assigneeId, requesterId, q (subject ilike), page, pageSize, sort |
| GET | /api/tickets/summary | role scoped | open/closed counts for dashboard cards |
| POST | /api/tickets | any active user | returns uuid + ticket_no |
| GET | /api/tickets/:id | requester, moderator, admin | 403 on cross-access (IDOR) |
| PUT | /api/tickets/:id | field dependent | status transition rules, assign, priority. Per-field authorization: users can only touch own resolved ticket to close it |
| DELETE | /api/tickets/:id | admin | |
| GET | /api/tickets/:id/comments | same as ticket detail | |
| POST | /api/tickets/:id/comments | requester, moderator, admin | |
| GET | /api/categories | any authenticated | |
| POST / PUT / DELETE | /api/categories/:id | admin | |
| GET | /api/users | admin | paginated, q filter |
| PUT | /api/users/:id | admin | `{ isActive }` or `{ role }` |

Pagination envelope:

```json
{ "data": [], "pagination": { "page": 1, "pageSize": 10, "totalCount": 42, "totalPages": 5 } }
```

Pagination, filtering and sorting always execute in SQL (Drizzle), never in memory on the client.

## Frontend routes

| Route | Access | Contents |
|---|---|---|
| /login, /signup | public | TanStack Form + Zod |
| /tickets | user | open/closed count cards, my tickets table, raise ticket dialog, detail view with comment thread |
| /tickets (moderator) | moderator | queue table: server-side pagination, filters, sort, URL state (shareable), assign and status quick actions |
| /tickets (admin) | admin | reuses moderator queue |
| /users | admin | all accounts, inactive badge, activate check action, role change, deactivate |
| /categories | admin | category CRUD |
| / | redirect by role | |

Navbar shows session name and role badge in the center. Role-aware layouts (server components) do the real guards, proxy.ts only checks cookie presence for redirects.

## File structure

```
proxy.ts                     cookie-presence redirects (login <-> tickets)
db.ts                        drizzle client, schema attached (root, @/db)
auth-schema.ts               better-auth tables (root)
drizzle.config.ts            explicit schema file list (keep enums.ts in it)
drizzle/                     generated migrations
lib/
  auth.ts                    better-auth server config + isActive gate + sign-in hook
  auth-client.ts             better-auth react client + adminClient
  api-error.ts               ApiError, jsonError, errorResponse, status helpers
  permissions.ts             role matrix, can(), STATUS_TRANSITIONS, canTransition()
  types.ts                   Role, Pagination, Paginated<T>, formatTicketNo
  db/                        domain schema: enums, categories, tickets, tickets-comments, schema barrel
  validations/               zod: auth, ticket, user (+categories in user.ts)
scripts/
  seed.ts                    wipe + 4 users via signUpEmail + categories + 14 tickets + comments
  verify-auth.ts             10-check gate regression script
app/
  layout.tsx                 fonts, ThemeProvider, Providers (QueryClient + Toaster)
  (authentication)/          login + signup, redirects away when session exists
  (protected)/               session-guarded: page.tsx redirect, tickets role switch, users, categories
  api/auth/[...all]/route.ts better-auth handler
components/
  providers.tsx              QueryClientProvider + sonner Toaster
  auth/                      login-form, signup-form, sign-out-button (TanStack Form + zod)
  tickets/                   client / moderator / admin page components (stubs for Phase 10)
```

State management rationale (goes in README): TanStack Query for all server state, TanStack Table for the grid, TanStack Form for inputs, URL search params as the single source of truth for filters and page, better-auth hooks for session.

## IDOR checklist

- Every /api/tickets/:id and comments route resolves the ticket and checks requesterId against session before responding. Ownership check is code, not a declarative permission.
- PUT authorizes per field, not per request: a user passing `{ assigneeId }` gets 403 even on their own ticket.
- Route params are numeric ids (serial pk). Enumeration alone is harmless because every access is authorized, do not rely on obscurity.
- Users list and admin mutations verify role from the server session, never from request body.

## Seed data

Users (all active, password `Password123!`):

| id | name | email | role |
|---|---|---|---|
| 1 | Amina Admin | admin@example.com | admin |
| 2 | Sam Support | sam@example.com | moderator |
| 3 | Priya Agent | priya@example.com | moderator (account reserved for the future AI agent) |
| 4 | Jordan Employee | jordan@example.com | user |

Let better-auth generate user ids, link seed rows by email. Create users through `auth.api.signUpEmail` so hashing matches, then set role and isActive.

Categories: IT Hardware, IT Access & VPN, HR Payroll.

Tickets: 12 to 15 rows, mixed statuses across the full lifecycle, mixed priorities, some unassigned, some assigned to each moderator, spread over createdAt dates so sorting and filtering are demonstrable. A few comments on the in_progress and resolved ones.

## Environment and setup

docker-compose.yml at repo root, README documents the one-liner:

```
docker compose up -d
```

```yaml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: helpdesk
    ports:
      - "5432:5432"
    volumes:
      - helpdesk-pgdata:/var/lib/postgresql/data
volumes:
  helpdesk-pgdata:
```

| Env var | Value (local) |
|---|---|
| DATABASE_URL | postgres://postgres:postgres@localhost:5432/helpdesk |
| BETTER_AUTH_SECRET | random 32+ chars |
| BETTER_AUTH_URL | http://localhost:3000 |
| RESEND_API_KEY | optional, unused in MVP |

Passwords with `@` break connection strings unless percent-encoded, so the local password stays plain.

## Build order

## Phase 1, Foundation

- [X] Install deps: better-auth, drizzle-orm, drizzle-kit, pg, @tanstack/react-query, @tanstack/react-table, @tanstack/react-form, zod, dotenv, tsx
- [x] docker-compose.yml, .env + .env.example (gitignore exception added for .env.example)
- [x] Drizzle client (db.ts) + drizzle.config.ts, connection verified
- [x] Scripts: db:generate, db:migrate, db:push, db:seed, db:studio

## Phase 2, Auth

- [X] Migrations generated and applied (drizzle/0000 baseline, 0001 ban fields, 0002 user.updated_at)
- [x] auth.ts: email/password, admin plugin, drizzle adapter with explicit schema
- [x] Endpoints /sign-up/email, /sign-in/email, /sign-out, /get-session provided by the better-auth handler, verified over HTTP
- [x] isActive additionalField, session databaseHook gate, sign-in before-hook 403 "pending activation"
- [x] app/api/auth/[...all]/route.ts handler
- [x] lib/auth-client.ts (react client + adminClient)
- [x] Signup/in/out/session (role) wired in the UI with useSession-ready client
- [x] scripts/verify-auth.ts: 10/10 checks pass (active login, admin login, wrong password 401, gated signup, inactive 403)

## Phase 3, Domain schema

- [X] categories, tickets, ticket_comments + drizzle relations for eager loading
- [X] Migrations applied, enums and FKs verified against the live DB

## Phase 4, Contracts

- [X] Zod schemas: lib/validations/auth.ts, ticket.ts, user.ts (+ categories in user.ts)
- [X] Shared types: lib/types.ts (pagination envelope, error shape types, ROLE_LABELS, formatTicketNo)
- [X] Error helper: lib/api-error.ts (ApiError, jsonError, errorResponse with zod details)
- [X] lib/permissions.ts (role matrix, can(), STATUS_TRANSITIONS, canTransition())

## Phase 5, Seed

- [X] scripts/seed.ts: 4 active users via signUpEmail + role/isActive updates, 3 categories, 14 tickets, 9 comments
- [X] Verified: all four logins work, tickets and comments present, dates spread for sorting demos

## Phase 6, Auth UI

- [X] /login, /signup with TanStack Form + Zod (Standard Schema validators)
- [X] Pending-activation success state on signup (signIn confirmation trick), distinct 403 on login
- [X] QueryClientProvider + sonner Toaster in components/providers.tsx
- [X] Route groups: app/(authentication) and app/(protected) with server-side session guards
- [X] proxy.ts cookie-presence redirects (login <-> tickets), matcher excludes api/_next/static
- [X] tickets/page.tsx role switch, users + categories admin-guarded stubs for Phase 10
- [X] Minimal header with role badge + sign out (placeholder for the Phase 7 navbar)

## Phase 7, Shell and guards

- [ ] Navbar, centered role badge, logout (replace the placeholder header)
- [x] Role-aware layouts redirecting by session ((protected)/layout.tsx + per-page role guards)
- [x] proxy.ts for cookie-presence redirects only
- [x] shadcn components: table, dialog, select, dropdown-menu, 
- [X] shadcn textarea, skeleton, tabs, pagination (button, input, label, card, badge, sonner installed)

## Phase 8, Tickets API

- [X] GET /api/tickets with SQL pagination, filters, sort, role scoping
- [X] GET /api/tickets/summary
- [X] POST, GET :id, PUT :id (per-field authz + transition rules), DELETE :id => (sets it as inactive instead of deleting it from the database admin will be able to see deleted items)
- [X] Comments GET + POST
- [X] lib/email.ts mock, called on create and resolve
- [X] Manual IDOR pass: user session hitting other tickets expects 403 on detail, put, comments

## Phase 9, Admin API

- [ ] Categories CRUD
- [ ] Users list + PUT (isActive, role)

## Phase 10, Dashboards

- [ ] User: count cards, my tickets, raise ticket dialog returning ticket_no, detail + comment thread
- [ ] Moderator: queue table, URL-state filters and page, quick actions (assign, status, priority)
- [ ] Admin: /users with activate and role actions, /categories, /tickets reusing moderator table

## Phase 11, Polish

- [ ] Loading skeletons, empty states (no matches vs no tickets), toasts on mutations, inline form errors
- [ ] Tablet width pass
- [ ] `bun run lint` + `bun run typecheck` clean

## Phase 12, Submission

- [ ] README: docker command, env vars, db:push, db:seed, run instructions, four credentials, permission matrix, state management rationale, API overview
- [ ] Fresh clone test: compose up, install, push, seed, login as each role
- [ ] Walk the grading criteria one by one

## Out of scope

- OpenAI similarity agent (Priya account is seeded for it, no integration)
- Real email delivery, daily admin stats email
- Ticket reopening, file attachments
