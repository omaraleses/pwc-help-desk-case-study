# Handoff, PwC Help Desk Case Study

Date: 2026-09-05. State after the white label initial commit. Read PLAN.md first, it holds the full spec, permission matrix and API design. This file records where implementation stands and how to continue.

## How to run

```
docker compose up -d
bun install
bun run db:migrate
bun run db:seed
bun run dev
```

Optional: `bun scripts/verify-auth.ts` (10-check auth regression), `bun run db:studio`.

Seeded credentials, password `Password123!` for all:

| Role | Email |
|---|---|
| admin | admin@example.com |
| moderator | sam@example.com |
| moderator | priya@example.com |
| user | jordan@example.com |

## Completed, Phases 1 to 6

- Schema and migrations in drizzle/ (0000 baseline, 0001 ban fields, 0002 user.updated_at). Serial ids everywhere, better-auth user.id is text and requesterId/assigneeId/authorId are text columns pointing at it.
- better-auth 1.7: email/password + admin plugin, drizzle adapter with explicit schema, baseURL from BETTER_AUTH_URL.
- Activation gate: signup default isActive false. databaseHooks.session.create.before returns false for inactive users, which blocks both sign-in and the post-signup auto-session. A hooks.before function matches /sign-in/email and throws 403 "pending activation" so the error differs from wrong password (401). Seed bypasses the gate with SEEDING=true.
- Signup UI confirms pending accounts by attempting signIn and matching the 403 message, since signUpEmail errors after the user row is already written (the aborted session surfaces as a 400).
- lib/permissions.ts: role matrix, can(role, permission), STATUS_TRANSITIONS, canTransition(). lib/api-error.ts: ApiError, jsonError, errorResponse (zod issues become 400 details). lib/validations/: auth, ticket, user. lib/types.ts: Pagination, Paginated<T>, ROLE_LABELS, formatTicketNo (pads serial id to #00001).
- Seed: 4 users via auth.api.signUpEmail then role/isActive updates, 3 categories, 14 tickets across all statuses and priorities (incl urgent), spread over 3 weeks, 9 comments.
- UI: app/(authentication) login + signup (TanStack Form + zod Standard Schema validators), app/(protected) with session guard, placeholder header with role badge + sign out, tickets role switch with stub dashboards, users and categories admin-guarded stubs, proxy.ts cookie-presence redirects, QueryClientProvider + sonner.
- Verified: bun run typecheck clean, bun run lint clean, verify-auth 10/10, live HTTP smoke (login page 200, / redirects to /login, sign-in 200 with role and isActive, bad credentials 401).

## Gotchas learned, read before touching auth

- better-auth 1.7 root `hooks.before` is a single function, not the {matcher, handler} array shape used by plugins. The context is typed MiddlewareInputContext, cast to read path and body.
- drizzle.config.ts lists schema files explicitly. Keep ./lib/db/enums.ts in the list: if a file defining enums is missing from the config, drizzle-kit generates DROP TYPE or CREATE TYPE statements by diffing against a stale snapshot.
- If you delete a bad migration, delete its snapshot in drizzle/meta and its _journal.json entry too, otherwise generate diffs against the wrong state.
- The CLI-generated auth-schema was missing user.updatedAt, banned, banReason and banExpires. better-auth errors at user creation without them. All present now.
- shadcn v4 here is base-ui based: Button takes `render={<Link />}`, there is no asChild prop.
- db.query.* relational API works because db.ts attaches schema including the relations. Use it for eager loading (db.query.tickets.findMany({ with: { requester: true, assignee: true, category: true } })).

## Next, Phase 7 to 12 in order

## Phase 7

- Replace the placeholder header in app/(protected)/layout.tsx with the real navbar: brand left, role badge and session name in the center, nav links (user: My Tickets, moderator: Queue, admin: Users + Categories) and sign out.
- Add shadcn: table, dialog, select, dropdown-menu, textarea, skeleton, tabs, pagination.

## Phase 8, tickets API (the graded centerpiece)

Create app/api/tickets/route.ts (GET list + POST create), app/api/tickets/summary/route.ts, app/api/tickets/[id]/route.ts (GET, PATCH, DELETE), app/api/tickets/[id]/comments/route.ts (GET, POST).

Rules, all enforced server-side:

- Authenticate with auth.api.getSession({ headers: await headers() }), 401 when missing.
- GET list: users get requesterId forced to their own id, moderators and admins see all. Parse query with ticketQuerySchema. Pagination, filters and sort in SQL via drizzle (and, ilike for q, orderBy per sort). Respond with the Paginated<T> envelope.
- GET detail + comments: user may only read tickets where requesterId is their id, else 403.
- POST create: ticketCreateSchema, sets requesterId from session, status open. Respond 201 with id and formatted ticket number. Call the email mock.
- PATCH: authorize per field. status requires ticket:status, run canTransition, resolved -> closed only for the requester or admin. priority requires ticket:priority. assigneeId requires ticket:assign and must be an active moderator or admin. Users touching any field other than closing their own resolved ticket get 403.
- DELETE: admin only (ticket:delete).
- Comments: POST allowed for requester and staff; GET same visibility as the ticket.
- lib/email.ts mock: sendTicketCreated / sendTicketResolved logging to console, called at create and on transition to resolved.
- IDOR pass: with jordan's session, hit sam-visible ticket detail, patch and comments, expect 403 on all three.

## Phase 9, admin API

- app/api/categories/route.ts (GET all authed, POST admin), app/api/categories/[id]/route.ts (PATCH, DELETE admin; DELETE returns 409 when tickets reference the category).
- app/api/users/route.ts (GET admin, paginated, q filter on name/email), app/api/users/[id]/route.ts (PATCH admin, userPatchSchema, isActive or role; forbid demoting yourself).

## Phase 10, dashboards

- Client tickets (components/tickets/client-tickets-page.tsx): summary cards (open, closed), my tickets table, raise ticket dialog (TanStack Form) showing the returned ticket number, detail view with comment thread. TanStack Query for all calls.
- Moderator queue (moderator-tickets-page.tsx): TanStack Table, server pagination, filters and sort stored in URL search params (shareable), quick actions via dropdowns (assign moderator, transition status, set priority) with optimistic updates invalidated by query refetch.
- Admin: users table with activate check action, role select, deactivate; categories CRUD page; admin tickets view reuses the queue.

## Phase 11 to 12

- Loading skeletons, distinct empty states (no tickets vs no matches), toasts on every mutation, inline field errors, tablet width pass.
- README: docker command, env vars, migrate + seed, credentials table, permission matrix, state management rationale, API overview.
- Fresh clone test end to end, then walk the grading criteria.

## Conventions

- Zod schemas only in lib/validations, never inline in routes. Use errorResponse(error) in every catch block.
- Authorization decisions go through can() and canTransition(), never compare role strings ad hoc.
- JSON error shape: { "error": { "code", "message" } } with details array for validation.
- Pagination envelope: { "data": [...], "pagination": { page, pageSize, totalCount, totalPages } }.
- Semantic commit prefixes for everything after the initial "white label initial commit". Never push to main.
