"use client"

import * as React from "react"
import {
  useTable,
  type ColumnVisibilityState,
  type PaginationState,
} from "@tanstack/react-table"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Settings2,
} from "lucide-react"

import {
  features,
} from "@/components/ui-features/data-table-features"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import {
  useCategories,
  useStaff,
  useTicketSummary,
  useTickets,
} from "@/hooks/use-tickets"
import {
  PRIORITY_LABELS,
  SORT_LABELS,
  STATUS_LABELS,
  type Priority,
  type Status,
} from "@/lib/types"
import { TICKET_SORTS } from "@/lib/validations/ticket"

import { getTicketColumns } from "./columns"
import { RaiseTicketDialog } from "./raise-ticket-dialog"
import { TicketDetailDialog } from "./ticket-detail-dialog"

const STATUSES: Status[] = ["open", "in_progress", "resolved", "closed"]
const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"]
const PAGE_SIZES = [10, 20, 50]

type FilterOption = { value: string; label: string }

function FilterSelect({
  value,
  placeholder,
  options,
  onChange,
  className,
}: {
  value: string | null
  placeholder: string
  options: FilterOption[]
  onChange: (value: string | null) => void
  className?: string
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {(selected: string | null) =>
            options.find((option) => option.value === selected)?.label ??
            placeholder
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function TicketsTable({
  canManage,
  canDelete,
}: {
  canManage: boolean
  canDelete: boolean
}) {
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({})
  const [searchInput, setSearchInput] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState<Status | null>(null)
  const [priority, setPriority] = React.useState<Priority | null>(null)
  const [categoryId, setCategoryId] = React.useState<string | null>(null)
  const [assigneeId, setAssigneeId] = React.useState<string | null>(null)
  const [sort, setSort] = React.useState<string>("createdAt_desc")
  const [detailId, setDetailId] = React.useState<number | null>(null)
  const [raiseOpen, setRaiseOpen] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const resetPage = () =>
    setPagination((previous) =>
      previous.pageIndex === 0 ? previous : { ...previous, pageIndex: 0 },
    )

  const summary = useTicketSummary()
  const categories = useCategories()
  const staff = useStaff()

  const { data, isPending, isPlaceholderData, isError, error } = useTickets({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    q: search || undefined,
    status: status ?? undefined,
    priority: priority ?? undefined,
    categoryId: categoryId ? Number(categoryId) : undefined,
    assigneeId: assigneeId ?? undefined,
    sort,
  })

  const staffList = React.useMemo(
    () => staff.data?.data ?? [],
    [staff.data],
  )

  const columns = React.useMemo(
    () =>
      getTicketColumns({
        canManage,
        canDelete,
        staff: staffList,
        onOpenDetail: setDetailId,
      }),
    [canManage, canDelete, staffList],
  )

  const table = useTable({
    features,
    data: data?.data ?? [],
    columns,
    manualPagination: true,
    manualFiltering: true,
    rowCount: data?.pagination.totalCount ?? 0,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    state: { pagination, columnVisibility },
  })

  const isLoading = isPending && !isPlaceholderData

  const hasFilters = Boolean(
    status || priority || categoryId || assigneeId || search,
  )

  const clearFilters = () => {
    setStatus(null)
    setPriority(null)
    setCategoryId(null)
    setAssigneeId(null)
    setSearchInput("")
    setSearch("")
    resetPage()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            {canManage ? "Ticket queue" : "My tickets"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "Work tickets, set priority, assign moderators and move status."
              : "Raise a ticket and follow its progress."}
          </p>
        </div>
        {!canManage && <Button onClick={() => setRaiseOpen(true)}>Raise ticket</Button>}
      </div>

      {!canManage && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summary.isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardHeader>
                  <Skeleton className="h-4 w-20" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <SummaryCard
                title="Open"
                value={summary.data?.open ?? 0}
                description="Waiting to be picked up"
              />
              <SummaryCard
                title="In progress"
                value={summary.data?.inProgress ?? 0}
                description="Being worked on"
              />
              <SummaryCard
                title="Resolved"
                value={summary.data?.resolved ?? 0}
                description="Awaiting your confirmation"
              />
              <SummaryCard
                title="Closed"
                value={summary.data?.closed ?? 0}
                description="Done"
              />
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search subject..."
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value)
              resetPage()
            }}
            className="ps-8"
          />
        </div>
        {canManage && (
          <>
            <FilterSelect
              value={status}
              placeholder="Status"
              options={STATUSES.map((value) => ({
                value,
                label: STATUS_LABELS[value],
              }))}
              onChange={(next) => {
                setStatus((next as Status) ?? null)
                resetPage()
              }}
            />
            <FilterSelect
              value={priority}
              placeholder="Priority"
              options={PRIORITIES.map((value) => ({
                value,
                label: PRIORITY_LABELS[value],
              }))}
              onChange={(next) => {
                setPriority((next as Priority) ?? null)
                resetPage()
              }}
            />
            <FilterSelect
              value={categoryId}
              placeholder="Category"
              options={(categories.data?.data ?? []).map((category) => ({
                value: String(category.id),
                label: category.name,
              }))}
              onChange={(next) => {
                setCategoryId(next)
                resetPage()
              }}
            />
            <FilterSelect
              value={assigneeId}
              placeholder="Assignee"
              options={staffList.map((member) => ({
                value: member.id,
                label: member.name,
              }))}
              onChange={(next) => {
                setAssigneeId(next)
                resetPage()
              }}
            />
            <FilterSelect
              value={sort}
              placeholder="Sort"
              className="w-44"
              options={TICKET_SORTS.map((value) => ({
                value,
                label: SORT_LABELS[value] ?? value,
              }))}
              onChange={(next) => setSort(next ?? "createdAt_desc")}
            />
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </>
        )}
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
                  onCheckedChange={(checked) => column.toggleVisibility(checked)}
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
                  {error?.message ?? "Failed to load tickets."}
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
                  {hasFilters
                    ? "No tickets match the current filters."
                    : "No tickets yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {data?.pagination.totalCount ?? 0} ticket
          {data?.pagination.totalCount === 1 ? "" : "s"}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${pagination.pageSize}`}
              onValueChange={(value) =>
                setPagination({ pageIndex: 0, pageSize: Number(value) })
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

      {!canManage && (
        <RaiseTicketDialog open={raiseOpen} onOpenChange={setRaiseOpen} />
      )}
      <TicketDetailDialog
        ticketId={detailId}
        onClose={() => setDetailId(null)}
        allowCloseResolved={!canManage || canDelete}
        canDelete={canDelete}
      />
    </div>
  )
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string
  value: number
  description: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
