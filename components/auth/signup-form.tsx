"use client"

import { useForm } from "@tanstack/react-form"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import { signUpSchema } from "@/lib/validations/auth"

export function SignupForm() {
  const [serverError, setServerError] = useState("")
  const [pendingActivation, setPendingActivation] = useState(false)

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setServerError("")
      const { error } = await authClient.signUp.email({
        name: value.name,
        email: value.email,
        password: value.password,
      })

      if (error && /already exist/i.test(error.message ?? "")) {
        setServerError("This email is already registered. Try signing in instead.")
        return
      }

      const confirmation = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      })
      if (
        confirmation.error &&
        /pending activation/i.test(confirmation.error.message ?? "")
      ) {
        setPendingActivation(true)
        return
      }

      setServerError(
        error?.message ?? confirmation.error?.message ?? "Unable to create account",
      )
      toast.error(
        error?.message ?? confirmation.error?.message ?? "Unable to create account",
      )
    },
  })

  if (pendingActivation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account created</CardTitle>
          <CardDescription>
            Your account is pending activation by an administrator. You will be
            able to sign in once it has been approved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" render={<Link href="/login" />}>
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          New accounts start deactivated until an admin approves them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
          className="space-y-4"
        >
          <form.Field name="name" validators={{ onBlur: signUpSchema.shape.name }}>
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Name</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  placeholder="Jordan Employee"
                  autoComplete="name"
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

          <form.Field name="email" validators={{ onBlur: signUpSchema.shape.email }}>
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Email</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
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
            name="password"
            validators={{ onBlur: signUpSchema.shape.password }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Password</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
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

          {serverError && (
            <p role="alert" className="text-destructive text-sm">
              {serverError}
            </p>
          )}

          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" className="w-full" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Creating account..." : "Sign up"}
              </Button>
            )}
          </form.Subscribe>

          <p className="text-muted-foreground text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
