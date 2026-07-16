"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type FormState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(registerAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" required autoComplete="name" />
        <FieldError>{state?.fieldErrors?.name}</FieldError>
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
        <FieldError>{state?.fieldErrors?.email}</FieldError>
      </div>
      <div>
        <Label htmlFor="phone">Phone number</Label>
        <Input id="phone" name="phone" required autoComplete="tel" placeholder="+234..." />
        <FieldError>{state?.fieldErrors?.phone}</FieldError>
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required autoComplete="new-password" />
        <FieldError>{state?.fieldErrors?.password}</FieldError>
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creating account..." : "Create Account"}
      </Button>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-light hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
