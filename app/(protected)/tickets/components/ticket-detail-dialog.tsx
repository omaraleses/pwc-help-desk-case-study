"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  useAddComment,
  useDeleteTicket,
  useTicket,
  useUpdateTicket,
} from "@/hooks/use-tickets"
import { formatDateTime } from "@/lib/format"
import { PriorityBadge, StatusBadge } from "./badges"

export function TicketDetailDialog({
  ticketId,
  onClose,
  allowCloseResolved = false,
  canDelete = false,
}: {
  ticketId: number | null
  onClose: () => void
  allowCloseResolved?: boolean
  canDelete?: boolean
}) {
  const { data: ticket, isLoading } = useTicket(ticketId)
  const addComment = useAddComment(ticketId)
  const updateTicket = useUpdateTicket()
  const deleteTicket = useDeleteTicket()
  const [commentBody, setCommentBody] = useState("")

  const comments = ticket?.comments ?? []

  return (
    <Dialog open={ticketId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {ticket ? (
              <>
                <span className="font-mono">{ticket.ticketNo}</span>
                <span className="truncate">{ticket.subject}</span>
              </>
            ) : (
              "Ticket"
            )}
          </DialogTitle>
          {ticket && (
            <DialogDescription>
              {ticket.category.name} | raised by {ticket.requester.name} on{" "}
              {formatDateTime(ticket.createdAt)}
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoading || !ticket ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {ticket.assignee && (
                <span className="text-muted-foreground text-xs">
                  Assigned to {ticket.assignee.name}
                </span>
              )}
              {ticket.deletedAt && (
                <span className="text-destructive text-xs">
                  Deleted {formatDateTime(ticket.deletedAt)}
                </span>
              )}
            </div>

            <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>

            <div className="space-y-3">
              <h3 className="text-xs font-medium tracking-wide uppercase">
                Comments ({comments.length})
              </h3>
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No comments yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {comments.map((comment) => (
                    <li key={comment.id} className="rounded-none border p-3">
                      <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">
                          {comment.author.name}
                        </span>
                        <span>{formatDateTime(comment.createdAt)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">
                        {comment.body}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Textarea
              rows={3}
              placeholder="Add a comment..."
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              disabled={addComment.isPending}
            />
          </div>
        )}

        <DialogFooter>
          {canDelete && ticket && !ticket.deletedAt && (
            <Button
              type="button"
              variant="destructive"
              className="me-auto"
              disabled={deleteTicket.isPending}
              onClick={() => {
                deleteTicket.mutate(ticket.id, { onSuccess: onClose })
              }}
            >
              {deleteTicket.isPending ? "Deleting..." : "Delete"}
            </Button>
          )}
          {allowCloseResolved && ticket?.status === "resolved" && (
            <Button
              type="button"
              disabled={updateTicket.isPending}
              onClick={() => {
                updateTicket.mutate(
                  { id: ticket.id, patch: { status: "closed" } },
                  { onSuccess: onClose },
                )
              }}
            >
              {updateTicket.isPending ? "Closing..." : "Close ticket"}
            </Button>
          )}
          <Button
            type="button"
            disabled={!commentBody.trim() || addComment.isPending}
            onClick={() => {
              const body = commentBody.trim()
              if (!body) return
              addComment.mutate(body, {
                onSuccess: () => setCommentBody(""),
              })
            }}
          >
            {addComment.isPending ? "Sending..." : "Comment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
