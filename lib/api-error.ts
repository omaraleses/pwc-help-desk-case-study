import { NextResponse } from "next/server"
import { ZodError } from "zod"

export const ERROR_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL: 500,
} as const

export type ErrorCode = keyof typeof ERROR_STATUS

export class ApiError extends Error {
  code: ErrorCode
  status: number

  constructor(code: ErrorCode, message: string) {
    super(message)
    this.code = code
    this.status = ERROR_STATUS[code]
  }
}

export function jsonError(code: ErrorCode, message: string) {
  const status = ERROR_STATUS[code]
  return NextResponse.json({ error: { code, message } }, { status })
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return jsonError(error.code, error.message)
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Validation failed",
          details: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
      { status: 400 },
    )
  }
  console.error(error)
  return jsonError("INTERNAL", "Something went wrong")
}

export const badRequest = (message: string) => new ApiError("BAD_REQUEST", message)
export const unauthorized = (message: string) => new ApiError("UNAUTHORIZED", message)
export const forbidden = (message: string) => new ApiError("FORBIDDEN", message)
export const notFound = (message: string) => new ApiError("NOT_FOUND", message)
export const conflict = (message: string) => new ApiError("CONFLICT", message)
