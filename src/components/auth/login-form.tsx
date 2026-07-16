"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type FormState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(loginAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
        <FieldError>{state?.fieldErrors?.email}</FieldError>
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
        <FieldError>{state?.fieldErrors?.password}</FieldError>
      </div>

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-xs text-brand-light hover:underline">
          Forgot password?
        </Link>
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Signing in..." : "Log In"}
      </Button>

      <p className="text-center text-sm text-muted">
        Don&rsquo;t have an account?{" "}
        <Link href="/register" className="text-brand-light hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
