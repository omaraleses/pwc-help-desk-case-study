"use client"

import {
    useTable,
    type ColumnVisibilityState,
    type PaginationState,
    type SortingState
} from "@tanstack/react-table"
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Search,
    Settings2,
} from "lucide-react"
import * as React from "react"

import {
    features
} from "@/components/ui-features/data-table-features"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useUsers } from "@/hooks/use-users"
import type { UserRole } from "@/lib/db/enums"
import { ROLE_LABELS } from "@/lib/types"

import { getColumns } from "./columns"

const ROLES: UserRole[] = ["user", "moderator", "admin"]
const ROLE_FILTER_ALL = "all"
const PAGE_SIZES = [10, 20, 50]

const roleFilterLabels: Record<string, string> = {
  [ROLE_FILTER_ALL]: "All roles",
  ...Object.fromEntries(ROLES.map((role) => [role, ROLE_LABELS[role]])),
}

export function UsersTable({ currentUserId }: { currentUserId: string }) {
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "email", desc: false },
  ])
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({})
  const [roleFilter, setRoleFilter] = React.useState<string>(ROLE_FILTER_ALL)
  const [searchInput, setSearchInput] = React.useState("")
  const [search, setSearch] = React.useState("")

  React.useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const sort =
    sorting.length > 0
      ? `${sorting[0].id}_${sorting[0].desc ? "desc" : "asc"}`
      : undefined

  const resetPage = () =>
    setPagination((previous) =>
      previous.pageIndex === 0 ? previous : { ...previous, pageIndex: 0 },
    )

  const { data, isPending, isPlaceholderData, isError, error } = useUsers({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    q: search || undefined,
    role:
      roleFilter === ROLE_FILTER_ALL ? undefined : (roleFilter as UserRole),
    sort,
  })

  const columns = React.useMemo(() => getColumns(currentUserId), [currentUserId])

  const table = useTable({
    features,
    data: data?.data ?? [],
    columns,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    rowCount: data?.pagination.totalCount ?? 0,
    onPaginationChange: setPagination,
    onSortingChange: (updater) => {
      setSorting(updater)
      resetPage()
    },
    onColumnVisibilityChange: setColumnVisibility,
    state: { pagination, sorting, columnVisibility },
  })

  const isLoading = isPending && !isPlaceholderData

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name or email..."
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value)
              resetPage()
            }}
            className="ps-8"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(value) => {
            setRoleFilter(String(value))
            resetPage()
          }}
        >
          <SelectTrigger>
            <SelectValue>
              {(value: string | null) =>
                roleFilterLabels[value ?? ROLE_FILTER_ALL]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {[ROLE_FILTER_ALL, ...ROLES].map((value) => (
              <SelectItem key={value} value={value}>
                {roleFilterLabels[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="sm" className="ml-auto" />}
          >
            <Settings2 />
            View
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(checked) =>
                    column.toggleVisibility(checked)
                  }
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={`skeleton-${rowIndex}`}>
                  {table.getVisibleLeafColumns().map((column) => (
                    <TableCell key={column.id}>
                      <Skeleton className="h-4 w-full max-w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {error?.message ?? "Failed to load users."}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 text-center"
                >
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {data?.pagination.totalCount ?? 0} account
          {data?.pagination.totalCount === 1 ? "" : "s"}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${pagination.pageSize}`}
              onValueChange={(value) =>
                setPagination({
                  pageIndex: 0,
                  pageSize: Number(value),
                })
              }
            >
              <SelectTrigger size="sm" className="w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm font-medium">
            Page {table.state.pagination.pageIndex + 1} of{" "}
            {Math.max(table.getPageCount(), 1)}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              className="hidden lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              className="hidden lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
