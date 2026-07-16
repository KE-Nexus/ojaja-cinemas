export function ScreenGlow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 60" className={className} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="screen-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--brand-light)" stopOpacity="0" />
          <stop offset="50%" stopColor="var(--brand-light)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--brand-light)" stopOpacity="0" />
        </linearGradient>
        <filter id="screen-blur">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>
      <path d="M 10 50 Q 200 5 390 50" stroke="url(#screen-grad)" strokeWidth="3" fill="none" filter="url(#screen-blur)" />
      <path d="M 10 50 Q 200 5 390 50" stroke="url(#screen-grad)" strokeWidth="1" fill="none" />
    </svg>
  );
}
