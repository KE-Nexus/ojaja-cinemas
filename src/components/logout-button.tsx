"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { AuthStatusOverlay, type AuthStatus } from "@/components/auth-status-overlay";

/** Drop-in replacement for `<form action={logoutAction}><button type="submit">...</button></form>` — same click target, but shows a preloader/success overlay instead of a silent redirect. */
export function LogoutButton({
  className,
  children,
  "aria-label": ariaLabel,
}: {
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [, startNavTransition] = useTransition();
  const [phase, setPhase] = useState<"idle" | "success" | "error">("idle");
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await logoutAction();
        setPhase("success");
        // Navigating inside a transition (rather than a fixed setTimeout) keeps this page —
        // overlay included — mounted and visible until the destination is actually ready to
        // show, instead of guessing a delay and risking a blank flash if it loads slower.
        startNavTransition(() => router.push(result.redirectTo));
      } catch {
        setPhase("error");
      }
    });
  }

  const overlayStatus: AuthStatus | null = isPending ? "pending" : phase === "success" ? "success" : phase === "error" ? "error" : null;

  return (
    <>
      <button type="button" onClick={handleClick} disabled={isPending} className={className} aria-label={ariaLabel}>
        {children}
      </button>
      <AuthStatusOverlay
        status={overlayStatus}
        pendingLabel="Signing out..."
        successLabel="Catch you later!"
        errorLabel="Something went wrong signing you out. Please try again."
        onDismiss={() => setPhase("idle")}
      />
    </>
  );
}
