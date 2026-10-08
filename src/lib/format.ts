const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
});

export function formatNaira(amount: number): string {
  return nairaFormatter.format(amount);
}

const WAT_TIME_ZONE = "Africa/Lagos";

/**
 * Parses a "YYYY-MM-DDTHH:mm" datetime-local string (from a scheduling form) as WAT
 * wall-clock time and returns the correct UTC instant — deliberately NOT `new Date(value)`,
 * which interprets a timezone-less string using the server process's own ambient timezone.
 * If that process isn't running in WAT (e.g. a UTC-configured deployment), every session
 * time silently shifts by the server/WAT offset. Nigeria has no DST, so WAT is always a
 * fixed UTC+1 — safe to hardcode rather than needing a timezone database.
 */
export function parseWatDateTimeLocal(value: string): Date {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = (timePart ?? "00:00").split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 1, minute));
}

export function formatShowtime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: WAT_TIME_ZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d) + " WAT";
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: WAT_TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: WAT_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Combined date+time, WAT-safe — for things like "Opened On"/"Closed On" columns. Deliberately
 * NOT `date.toLocaleString("en-NG")`: that formats using the server process's own ambient
 * timezone, which silently shows a wrong time (e.g. session close times an hour off) whenever
 * the server isn't itself running in WAT.
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: WAT_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function formatRuntime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
