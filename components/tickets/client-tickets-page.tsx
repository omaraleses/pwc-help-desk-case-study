"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function ClientTicketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">My tickets</h1>
        <p className="text-muted-foreground text-sm">
          Raise a ticket and follow its progress.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            Placeholder. Phase 10 wires this to GET /api/tickets and
            /api/tickets/summary.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
            <li>Open / closed count cards</li>
            <li>My tickets table with server-side pagination</li>
            <li>Raise ticket dialog returning the ticket number</li>
            <li>Ticket detail with comment thread</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
