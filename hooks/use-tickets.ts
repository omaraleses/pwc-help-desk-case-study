"use client"

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { apiFetch } from "@/lib/api"
import type { Paginated } from "@/lib/types"
import type { TicketPriority, TicketStatus } from "@/lib/db/enums"
import type {
  TicketCreateInput,
  TicketPatchInput,
} from "@/lib/validations/ticket"

export type TicketSummary = {
  open: number
  inProgress: number
  resolved: number
  closed: number
  total: number
}

export type TicketListItem = {
  id: number
  ticketNo: string
  subject: string
  status: TicketStatus
  priority: TicketPriority
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  category: { id: number; name: string }
  requester: { id: string; name: string }
  assignee: { id: string; name: string } | null
}

export type TicketCommentItem = {
  id: number
  body: string
  createdAt: string
  author: { id: string; name: string }
}

export type TicketDetail = TicketListItem & {
  description: string
  comments: TicketCommentItem[]
}

export type TicketQueryParams = {
  page?: number
  pageSize?: number
  status?: TicketStatus
  priority?: TicketPriority
  categoryId?: number
  assigneeId?: string
  requesterId?: string
  q?: string
  sort?: string
}

export const ticketKeys = {
  all: ["tickets"] as const,
  list: (params: TicketQueryParams) => ["tickets", "list", params] as const,
  summary: ["tickets", "summary"] as const,
  detail: (id: number) => ["tickets", "detail", id] as const,
  comments: (id: number) => ["tickets", "detail", id, "comments"] as const,
}

function toSearch(params: TicketQueryParams): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value))
    }
  }
  return search.toString()
}

export function useTickets(params: TicketQueryParams) {
  return useQuery({
    queryKey: ticketKeys.list(params),
    queryFn: () =>
      apiFetch<Paginated<TicketListItem>>(`/api/tickets?${toSearch(params)}`),
  })
}

export function useTicketSummary() {
  return useQuery({
    queryKey: ticketKeys.summary,
    queryFn: () => apiFetch<TicketSummary>("/api/tickets/summary"),
  })
}

export function useTicket(id: number | null) {
  return useQuery({
    queryKey: ticketKeys.detail(id ?? 0),
    queryFn: () => apiFetch<TicketDetail>(`/api/tickets/${id}`),
    enabled: id !== null,
  })
}

export function useComments(ticketId: number | null) {
  return useQuery({
    queryKey: ticketKeys.comments(ticketId ?? 0),
    queryFn: () =>
      apiFetch<{ data: TicketCommentItem[] }>(
        `/api/tickets/${ticketId}/comments`,
      ),
    enabled: ticketId !== null,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () =>
      apiFetch<{
        data: { id: number; name: string; ticketCount: number }[]
      }>("/api/categories"),
  })
}

export function useStaff() {
  return useQuery({
    queryKey: ["users", "staff"],
    queryFn: () =>
      apiFetch<{ data: { id: string; name: string; role: string }[] }>(
        "/api/users?staff=true",
      ),
  })
}

export function useCreateTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TicketCreateInput) =>
      apiFetch<{ id: number; ticketNo: string }>("/api/tickets", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: async (created) => {
      toast.success(`Ticket ${created.ticketNo} created`)
      await queryClient.invalidateQueries({ queryKey: ["tickets"] })
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useAddComment(ticketId: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) =>
      apiFetch<TicketCommentItem>(`/api/tickets/${ticketId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: async () => {
      if (ticketId !== null) {
        await queryClient.invalidateQueries({
          queryKey: ticketKeys.detail(ticketId),
        })
      }
    },
    onError: (error) => toast.error(error.message),
  })
}

type UpdateTicketVariables = { id: number; patch: TicketPatchInput }
type UpdateTicketContext = {
  previousLists: [readonly unknown[], Paginated<TicketListItem> | undefined][]
  previousDetail: TicketDetail | undefined
}

function applyOptimisticUpdate(
  queryClient: QueryClient,
  { id, patch }: UpdateTicketVariables,
) {
  queryClient.setQueriesData<Paginated<TicketListItem>>(
    { queryKey: ["tickets", "list"] },
    (old) =>
      old
        ? {
            ...old,
            data: old.data.map((ticket) =>
              ticket.id === id ? { ...ticket, ...patch } : ticket,
            ),
          }
        : old,
  )
  queryClient.setQueryData<TicketDetail>(ticketKeys.detail(id), (old) =>
    old ? { ...old, ...patch } : old,
  )
}

export function useUpdateTicket() {
  const queryClient = useQueryClient()
  return useMutation<
    TicketDetail,
    Error,
    UpdateTicketVariables,
    UpdateTicketContext
  >({
    mutationFn: ({ id, patch }) =>
      apiFetch<TicketDetail>(`/api/tickets/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ticketKeys.all })
      const previousLists = queryClient.getQueriesData<Paginated<TicketListItem>>({
        queryKey: ["tickets", "list"],
      })
      const previousDetail = queryClient.getQueryData<TicketDetail>(
        ticketKeys.detail(variables.id),
      )
      applyOptimisticUpdate(queryClient, variables)
      return { previousLists, previousDetail }
    },
    onError: (error, variables, context) => {
      toast.error(error.message)
      if (context) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data)
        }
        queryClient.setQueryData(
          ticketKeys.detail(variables.id),
          context.previousDetail,
        )
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tickets"] })
    },
  })
}

export function useDeleteTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ id: number; ticketNo: string }>(`/api/tickets/${id}`, {
        method: "DELETE",
      }),
    onSuccess: async (deleted) => {
      toast.success(`Ticket ${deleted.ticketNo} deleted`)
      await queryClient.invalidateQueries({ queryKey: ["tickets"] })
    },
    onError: (error) => toast.error(error.message),
  })
}
