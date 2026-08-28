"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginAction, type FormState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { AuthStatusOverlay, type AuthStatus } from "@/components/auth-status-overlay";

export function LoginForm() {
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

        <p className="text-center text-sm text-muted">
          Don&rsquo;t have an account?{" "}
          <Link href="/register" className="text-brand-light hover:underline">
            Sign up
          </Link>
        </p>
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
