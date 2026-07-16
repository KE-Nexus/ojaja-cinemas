"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { cn } from "@/lib/cn";

export function CountdownTimer({ expiresAt, onExpire }: { expiresAt: string; onExpire?: () => void }) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onExpire?.();
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire, router]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const urgent = secondsLeft <= 60;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
        urgent ? "border-danger/40 bg-danger/10 text-danger" : "border-brand/40 bg-brand/10 text-brand-light"
      )}
    >
      <Clock size={16} className={urgent ? "animate-pulse" : ""} />
      Seats held for {minutes}:{seconds.toString().padStart(2, "0")}
    </div>
  );
}
