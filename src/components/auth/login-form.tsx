"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginAction, type FormState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { AuthStatusOverlay, type AuthStatus } from "@/components/auth-status-overlay";

export function LoginForm({ variant = "customer" }: { variant?: "customer" | "staff" }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(loginAction, null);
  const [phase, setPhase] = useState<"idle" | "success" | "error">("idle");
  const [prevState, setPrevState] = useState(state);
  const [, startNavTransition] = useTransition();
  const router = useRouter();

  if (prevState !== state) {
    setPrevState(state);
    if (state?.success && state.redirectTo) setPhase("success");
    else if (state?.error) setPhase("error");
  }

  useEffect(() => {
    // Navigating inside a transition (rather than a fixed setTimeout) keeps this page —
    // overlay included — mounted and visible until the destination is actually ready to
    // show, instead of guessing a delay and risking a blank flash if it loads slower.
    if (phase === "success" && state?.redirectTo) {
      const redirectTo = state.redirectTo;
      startNavTransition(() => router.push(redirectTo));
    }
  }, [phase, state, router, startNavTransition]);

  const overlayStatus: AuthStatus | null = isPending ? "pending" : phase === "success" ? "success" : phase === "error" ? "error" : null;

  // Customer web login is disabled — guests still book without an account, and this keeps
  // /login from being a dead page rather than silently rendering a non-functional form.
  if (variant === "customer") {
    return (
      <p className="rounded-xl border border-border bg-surface-2/60 p-4 text-sm text-muted">
        Online account login is currently unavailable. You can still book tickets as a guest, or visit any OJAJA cinema for assistance.
      </p>
    );
  }

  return (
    <>
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

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Signing in..." : "Log In"}
        </Button>
      </form>

      <AuthStatusOverlay
        status={overlayStatus}
        pendingLabel="Signing in..."
        successLabel="Welcome back!"
        errorLabel={state?.error}
        onDismiss={() => setPhase("idle")}
      />
    </>
  );
}
