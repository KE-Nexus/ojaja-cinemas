"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- next-themes hydration-safe mount gate
  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-muted transition-colors hover:border-brand/50 hover:text-brand-light",
        className
      )}
    >
      {mounted && (
        <>
          <Sun size={15} className={cn("absolute transition-all duration-300", isDark ? "scale-0 opacity-0 rotate-90" : "scale-100 opacity-100 rotate-0")} />
          <Moon size={15} className={cn("absolute transition-all duration-300", isDark ? "scale-100 opacity-100 rotate-0" : "scale-0 opacity-0 -rotate-90")} />
        </>
      )}
    </button>
  );
}
