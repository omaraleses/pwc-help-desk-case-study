"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { apiFetch } from "@/lib/api"
import type { UserRole } from "@/lib/db/enums"
import { type Paginated, ROLE_LABELS } from "@/lib/types"
import type { UserPatchInput } from "@/lib/validations/user"

export type UserRow = {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  createdAt: string
}

export type UserQueryParams = {
  page?: number
  pageSize?: number
  q?: string
  role?: UserRole
  sort?: string
}

export const userKeys = {
  all: ["users"] as const,
  list: (params: UserQueryParams) => ["users", "list", params] as const,
}

function toSearch(params: UserQueryParams): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value))
    }
  }
  return search.toString()
}

export function useUsers(params: UserQueryParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () =>
      apiFetch<Paginated<UserRow>>(`/api/users?${toSearch(params)}`),
    placeholderData: keepPreviousData,
  })
}

type UpdateUserVariables = { id: string; patch: UserPatchInput }
type UpdateUserContext = {
  previousLists: [readonly unknown[], Paginated<UserRow> | undefined][]
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation<UserRow, Error, UpdateUserVariables, UpdateUserContext>({
    mutationFn: ({ id, patch }: UpdateUserVariables) =>
      apiFetch<UserRow>(`/api/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: userKeys.all })
      const previousLists = queryClient.getQueriesData<Paginated<UserRow>>({
        queryKey: ["users", "list"],
      })
      const { id, patch } = variables
      queryClient.setQueriesData<Paginated<UserRow>>(
        { queryKey: ["users", "list"] },
        (old) =>
          old
            ? {
                ...old,
                data: old.data.map((row) =>
                  row.id === id ? { ...row, ...patch } : row
                ),
              }
            : old
      )
      return { previousLists }
    },
    onSuccess: (_updated, variables) => {
      const { patch } = variables
      if (patch.role !== undefined) {
        toast.success(`Role set to ${ROLE_LABELS[patch.role]}`)
      } else if (patch.isActive !== undefined) {
        toast.success(patch.isActive ? "Account activated" : "Account deactivated")
      }
    },
    onError: (error, _variables, context) => {
      toast.error(error.message)
      if (context) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data)
        }
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })
}
