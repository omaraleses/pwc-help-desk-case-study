"use client"

import { useForm } from "@tanstack/react-form"
import { useEffect } from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  useCategories,
  useCreateTicket,
} from "@/hooks/use-tickets"
import { PRIORITY_LABELS } from "@/lib/types"
import { ticketCreateSchema } from "@/lib/validations/ticket"

const PRIORITIES = ["low", "medium", "high", "urgent"] as const

export function RaiseTicketDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data } = useCategories()
  const createTicket = useCreateTicket()
  const categories = data?.data ?? []

  const form = useForm({
    defaultValues: {
      subject: "",
      description: "",
      categoryId: 0,
      priority: "medium" as (typeof PRIORITIES)[number],
    },
    onSubmit: async ({ value, formApi }) => {
      await createTicket.mutateAsync(value)
      formApi.reset()
      onOpenChange(false)
    },
  })

  useEffect(() => {
    if (!open) form.reset()
  }, [open, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Raise a ticket</DialogTitle>
          <DialogDescription>
            Describe the issue and pick the closest category.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
          className="space-y-4"
        >
          <form.Field
            name="subject"
            validators={{ onBlur: ticketCreateSchema.shape.subject }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Subject</Label>
                <Input
                  id={field.name}
                  placeholder="Short summary of the issue"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-destructive text-sm">
                    {String(field.state.meta.errors[0]?.message ?? "")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="description"
            validators={{ onBlur: ticketCreateSchema.shape.description }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Description</Label>
                <Textarea
                  id={field.name}
                  rows={4}
                  placeholder="What happened, when, any error messages"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-destructive text-sm">
                    {String(field.state.meta.errors[0]?.message ?? "")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field
              name="categoryId"
              validators={{
                onBlur: z.number().int().positive("Pick a category"),
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Category</Label>
                  <Select
                    value={field.state.value === 0 ? null : String(field.state.value)}
                    onValueChange={(value) => field.handleChange(Number(value))}
                  >
                    <SelectTrigger id={field.name} className="w-full">
                      <SelectValue placeholder="Pick a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-destructive text-sm">
                      {String(field.state.meta.errors[0]?.message ?? "")}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="priority">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Priority</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) =>
                      field.handleChange(value as (typeof PRIORITIES)[number])
                    }
                  >
                    <SelectTrigger id={field.name} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {PRIORITY_LABELS[priority]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create ticket"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
