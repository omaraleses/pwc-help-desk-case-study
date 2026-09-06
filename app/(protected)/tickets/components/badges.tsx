import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  type Priority,
  type Status,
} from "@/lib/types"

const STATUS_CLASS: Record<Status, string> = {
  open: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  resolved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  closed: "bg-muted text-muted-foreground",
}

const PRIORITY_CLASS: Record<Priority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  high: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  urgent: "bg-destructive/10 text-destructive",
}

export function StatusBadge({
  status,
  className,
}: {
  status: Status
  className?: string
}) {
  return (
    <Badge variant="secondary" className={cn(STATUS_CLASS[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority
  className?: string
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(PRIORITY_CLASS[priority], className)}
    >
      {PRIORITY_LABELS[priority]}
    </Badge>
  )
}
