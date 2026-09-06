"use client"

import { createColumnHelper } from "@tanstack/react-table"

import type { DataTableFeatures } from "@/components/ui-features/data-table-features"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUpdateTicket, type TicketListItem } from "@/hooks/use-tickets"
import { formatDate } from "@/lib/format"
import { STATUS_TRANSITIONS } from "@/lib/permissions"
import { PRIORITY_LABELS, STATUS_LABELS, type Priority } from "@/lib/types"

import { PriorityBadge, StatusBadge } from "./badges"

const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"]

const columnHelper = createColumnHelper<DataTableFeatures, TicketListItem>()

function PriorityCell({ ticket }: { ticket: TicketListItem }) {
  const updateTicket = useUpdateTicket()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<button type="button" className="cursor-pointer" />}
      >
        <PriorityBadge priority={ticket.priority} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Set priority</DropdownMenuLabel>
          {PRIORITIES.map((priority) => (
            <DropdownMenuItem
              key={priority}
              disabled={priority === ticket.priority}
              onClick={() =>
                updateTicket.mutate({ id: ticket.id, patch: { priority } })
              }
            >
              {PRIORITY_LABELS[priority]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function StatusCell({
  ticket,
  canDelete,
}: {
  ticket: TicketListItem
  canDelete: boolean
}) {
  const updateTicket = useUpdateTicket()
  const options = STATUS_TRANSITIONS[ticket.status].filter(
    (next) => next !== "closed" || canDelete
  )
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<button type="button" className="cursor-pointer" />}
      >
        <StatusBadge status={ticket.status} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Move to</DropdownMenuLabel>
          {options.length === 0 ? (
            <DropdownMenuItem disabled>
              No transitions available
            </DropdownMenuItem>
          ) : (
            options.map((next) => (
              <DropdownMenuItem
                key={next}
                onClick={() =>
                  updateTicket.mutate({
                    id: ticket.id,
                    patch: { status: next },
                  })
                }
              >
                {STATUS_LABELS[next]}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AssigneeCell({
  ticket,
  staff,
}: {
  ticket: TicketListItem
  staff: { id: string; name: string }[]
}) {
  const updateTicket = useUpdateTicket()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<button type="button" className="cursor-pointer" />}
      >
        {ticket.assignee?.name ?? (
          <span className="text-muted-foreground">Unassigned</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Assign to</DropdownMenuLabel>
          {staff.map((member) => (
            <DropdownMenuItem
              key={member.id}
              disabled={member.id === ticket.assignee?.id}
              onClick={() =>
                updateTicket.mutate({
                  id: ticket.id,
                  patch: { assigneeId: member.id },
                })
              }
            >
              {member.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!ticket.assignee}
            onClick={() =>
              updateTicket.mutate({
                id: ticket.id,
                patch: { assigneeId: null },
              })
            }
          >
            Unassign
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export type TicketColumnsDeps = {
  canManage: boolean
  canDelete: boolean
  staff: { id: string; name: string }[]
  onOpenDetail: (id: number) => void
}

export function getTicketColumns({
  canManage,
  canDelete,
  staff,
  onOpenDetail,
}: TicketColumnsDeps) {
  return columnHelper.columns([
    columnHelper.accessor("ticketNo", {
      header: "No.",
      cell: ({ row }) => (
        <span className="font-mono">{row.original.ticketNo}</span>
      ),
    }),
    columnHelper.accessor("subject", {
      header: "Subject",
      cell: ({ row }) => (
        <button
          type="button"
          className="max-w-64 truncate text-start hover:underline"
          onClick={() => onOpenDetail(row.original.id)}
        >
          {row.original.subject}
        </button>
      ),
    }),
    ...(canManage
      ? [
          columnHelper.accessor((row) => row.requester.name, {
            id: "requester",
            header: "Requester",
          }),
        ]
      : []),
    columnHelper.accessor((row) => row.category.name, {
      id: "category",
      header: "Category",
    }),
    columnHelper.accessor("priority", {
      header: "Priority",
      cell: ({ row }) =>
        canManage ? (
          <PriorityCell ticket={row.original} />
        ) : (
          <PriorityBadge priority={row.original.priority} />
        ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ row }) =>
        canManage ? (
          <StatusCell ticket={row.original} canDelete={canDelete} />
        ) : (
          <StatusBadge status={row.original.status} />
        ),
    }),
    columnHelper.accessor("assignee", {
      header: "Assignee",
      cell: ({ row }) =>
        canManage ? (
          <AssigneeCell ticket={row.original} staff={staff} />
        ) : (
          (row.original.assignee?.name ?? (
            <span className="text-muted-foreground">Unassigned</span>
          ))
        ),
    }),
    columnHelper.accessor("createdAt", {
      header: "Raised",
      cell: ({ row }) => formatDate(row.original.createdAt),
    }),
    columnHelper.display({
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenDetail(row.original.id)}
          >
            View
          </Button>
        </div>
      ),
    }),
  ])
}
