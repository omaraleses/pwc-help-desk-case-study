"use client"

import { createColumnHelper, type Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal } from "lucide-react"

import type { DataTableFeatures } from "@/components/ui-features/data-table-features"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type UserRow, useUpdateUser } from "@/hooks/use-users"
import type { UserRole } from "@/lib/db/enums"
import { ROLE_LABELS } from "@/lib/types"

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

const roleBadgeVariants: Record<UserRole, "default" | "secondary" | "outline"> =
  {
    admin: "default",
    moderator: "secondary",
    user: "outline",
  }

const ROLES: UserRole[] = ["user", "moderator", "admin"]

const columnHelper = createColumnHelper<DataTableFeatures, UserRow>()

function SortableHeader<TValue>({
  column,
  title,
}: {
  column: Column<DataTableFeatures, UserRow, TValue>
  title: string
}) {
  const sorted = column.getIsSorted()
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ms-2"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {title}
      {sorted === "asc" ? (
        <ArrowUp />
      ) : sorted === "desc" ? (
        <ArrowDown />
      ) : (
        <ArrowUpDown className="opacity-50" />
      )}
    </Button>
  )
}

function RowActions({
  user,
  currentUserId,
}: {
  user: UserRow
  currentUserId: string
}) {
  const updateUser = useUpdateUser()
  const isSelf = user.id === currentUserId

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <span className="sr-only">Open menu</span>
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Role</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={user.role}
            onValueChange={(role) => {
              if (role !== user.role) {
                updateUser.mutate({
                  id: user.id,
                  patch: { role: role as UserRole },
                })
              }
            }}
          >
            {ROLES.map((role) => (
              <DropdownMenuRadioItem
                key={role}
                value={role}
                disabled={isSelf && role !== "admin"}
              >
                {ROLE_LABELS[role]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isSelf}
          onClick={() =>
            updateUser.mutate({
              id: user.id,
              patch: { isActive: !user.isActive },
            })
          }
        >
          {user.isActive ? "Deactivate" : "Activate"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function getColumns(currentUserId: string) {
  return columnHelper.columns([
    columnHelper.accessor("name", {
      header: ({ column }) => <SortableHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    }),
    columnHelper.accessor("email", {
      header: ({ column }) => <SortableHeader column={column} title="Email" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email}</span>
      ),
    }),
    columnHelper.accessor("role", {
      header: ({ column }) => <SortableHeader column={column} title="Role" />,
      cell: ({ row }) => (
        <Badge variant={roleBadgeVariants[row.original.role]}>
          {ROLE_LABELS[row.original.role]}
        </Badge>
      ),
    }),
    columnHelper.accessor("isActive", {
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "secondary" : "destructive"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    }),
    columnHelper.accessor("createdAt", {
      header: ({ column }) => (
        <SortableHeader column={column} title="Created" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {dateFormatter.format(new Date(row.original.createdAt))}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <RowActions user={row.original} currentUserId={currentUserId} />
        </div>
      ),
    }),
  ])
}
