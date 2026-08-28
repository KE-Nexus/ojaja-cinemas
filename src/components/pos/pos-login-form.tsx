"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Delete, LogIn } from "lucide-react";
import { posLoginAction, type PosLoginState } from "@/actions/pos/auth";
import { AuthStatusOverlay, type AuthStatus } from "@/components/auth-status-overlay";
import { cn } from "@/lib/cn";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "enter"];

export function PosLoginForm() {
  const [state, formAction, isPending] = useActionState<PosLoginState, FormData>(posLoginAction, null);
  const [staffNumber, setStaffNumber] = useState("");
  const [pin, setPin] = useState("");
  const [activeField, setActiveField] = useState<"staffNumber" | "pin">("staffNumber");
  const formRef = useRef<HTMLFormElement>(null);
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

  function press(key: string) {
    const set = activeField === "staffNumber" ? setStaffNumber : setPin;
    if (key === "back") {
      set((v) => v.slice(0, -1));
    } else if (key === "enter") {
      formRef.current?.requestSubmit();
    } else {
      set((v) => (v.length < 12 ? v + key : v));
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(194,44,201,0.35),transparent),radial-gradient(ellipse_60%_50%_at_100%_100%,rgba(56,224,255,0.15),transparent)] bg-black px-4 py-10">
      <AuthStatusOverlay
        status={overlayStatus}
        pendingLabel="Signing in..."
        successLabel="Welcome back!"
        errorLabel={state?.error}
        onDismiss={() => setPhase("idle")}
      />
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />

      <div className="glass glow-brand relative z-10 w-full max-w-sm rounded-3xl border border-white/10 p-8">
        <div className="mb-8 flex flex-col items-center">
          <Image src="/logo-mark.png" alt="OJAJA Cinemas" width={441} height={229} className="mb-2 h-10 w-auto" priority />
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Point of Sale</p>
        </div>

        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="staffNumber" value={staffNumber} />
          <input type="hidden" name="pin" value={pin} />

          <div>
            <label htmlFor="staffNumberInput" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              User Number
            </label>
            <input
              id="staffNumberInput"
              value={staffNumber}
              onChange={(e) => setStaffNumber(e.target.value)}
              onFocus={() => setActiveField("staffNumber")}
              placeholder="Enter user number"
              autoComplete="off"
              className={cn(
                "flex h-12 w-full items-center rounded-xl border bg-white/5 px-4 text-left text-lg font-semibold tracking-widest text-white outline-none placeholder:text-muted placeholder:tracking-normal transition-colors",
                activeField === "staffNumber" ? "border-brand-light shadow-[0_0_0_3px_rgba(194,44,201,0.25)]" : "border-white/10"
              )}
            />
          </div>

          <div>
            <label htmlFor="pinInput" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Pin
            </label>
            <input
              id="pinInput"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onFocus={() => setActiveField("pin")}
              placeholder="Enter PIN"
              autoComplete="off"
              className={cn(
                "flex h-12 w-full items-center rounded-xl border bg-white/5 px-4 text-left text-lg font-semibold tracking-[0.5em] text-white outline-none placeholder:text-muted placeholder:tracking-normal transition-colors",
                activeField === "pin" ? "border-brand-light shadow-[0_0_0_3px_rgba(194,44,201,0.25)]" : "border-white/10"
              )}
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-2">
            {KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => press(key)}
                className={cn(
                  "flex h-14 items-center justify-center rounded-xl border text-lg font-semibold transition-all active:scale-95",
                  key === "enter"
                    ? "border-brand bg-brand text-white hover:bg-brand-light"
                    : "border-white/10 bg-white/5 text-white hover:border-brand-light/50 hover:bg-white/10"
                )}
              >
                {key === "back" ? <Delete size={18} /> : key === "enter" ? <LogIn size={18} /> : key}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={isPending || !staffNumber || !pin}
            className="w-full rounded-xl bg-gradient-to-r from-brand to-accent-cyan py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(194,44,201,0.6)] transition-transform active:scale-[0.98] disabled:opacity-40"
          >
            {isPending ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
