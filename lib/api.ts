import type { ApiErrorBody } from "@/lib/types"

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = (await res.json()) as ApiErrorBody
      if (body?.error?.message) message = body.error.message
    } catch {
      // keep generic message
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}
