export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatCount(count: number, noun: string): string {
  if (count === 1) return `1 ${noun}`
  return `${count} ${noun}s`
}
