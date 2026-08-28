"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlayCircle, LogOut } from "lucide-react";
import { openStaffSessionAction } from "@/actions/admin/staff-sessions";
import { LogoutButton } from "@/components/logout-button";

export function OpenSessionPrompt({ staffName, branchName }: { staffName: string; branchName: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleOpen() {
    startTransition(async () => {
      const result = await openStaffSessionAction();
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Session opened.");
      router.refresh();
    });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(194,44,201,0.35),transparent)] bg-black px-4">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="glass glow-brand relative z-10 w-full max-w-sm rounded-3xl border border-white/10 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Point of Sale</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Welcome, {staffName.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted">{branchName}</p>
        <p className="mt-6 text-sm text-foreground/80">Open your cash session to start selling.</p>

        <button
          onClick={handleOpen}
          disabled={isPending}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-accent-cyan py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(194,44,201,0.6)] transition-transform active:scale-[0.98] disabled:opacity-40"
        >
          <PlayCircle size={18} /> {isPending ? "Opening..." : "Open Session"}
        </button>

        <LogoutButton className="mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-xs text-muted hover:text-foreground">
          <LogOut size={13} /> Log off
        </LogoutButton>
      </div>
    </div>
  );
}
