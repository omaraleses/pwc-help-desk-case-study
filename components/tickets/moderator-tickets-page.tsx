"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function ModeratorTicketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Ticket queue</h1>
        <p className="text-muted-foreground text-sm">
          All tickets across every requester.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Queue</CardTitle>
          <CardDescription>
            Placeholder. Phase 10 wires this to GET /api/tickets with URL-state
            filters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
            <li>TanStack Table with server-side pagination, filter, sort</li>
            <li>Shareable URL state for filters and page</li>
            <li>Quick actions: assign, status transition, priority</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
