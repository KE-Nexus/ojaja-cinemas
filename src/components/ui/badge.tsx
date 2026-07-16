import { cn } from "@/lib/cn";

type Tone = "brand" | "neutral" | "success" | "danger" | "gold";

const toneClasses: Record<Tone, string> = {
  brand: "bg-brand/15 text-brand-light border-brand/30",
  neutral: "bg-surface-2 text-muted border-border",
  success: "bg-success/15 text-success border-success/30",
  danger: "bg-danger/15 text-danger border-danger/30",
  gold: "bg-accent-gold/15 text-accent-gold border-accent-gold/30",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
