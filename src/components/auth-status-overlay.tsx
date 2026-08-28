"use client";

import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export type AuthStatus = "pending" | "success" | "error";

export function AuthStatusOverlay({
  status,
  pendingLabel,
  successLabel,
  errorLabel,
  onDismiss,
}: {
  status: AuthStatus | null;
  pendingLabel: string;
  successLabel?: string;
  errorLabel?: string;
  onDismiss?: () => void;
}) {
  if (!status) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={status === "error" ? onDismiss : undefined}
    >
      <div
        className="flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-8 py-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {status === "pending" && (
          <>
            <Loader2 size={36} className="animate-spin text-brand-light" />
            <p className="text-sm font-medium">{pendingLabel}</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 size={36} className="text-success" />
            <p className="text-sm font-medium">{successLabel}</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle size={36} className="text-danger" />
            <p className="text-sm font-medium">{errorLabel}</p>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="mt-1 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-light"
              >
                Try Again
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
