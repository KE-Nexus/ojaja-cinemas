export type ReportDefinition = {
  key: string;
  label: string;
  description: string;
};

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  { key: "daily-operations", label: "Daily Operations Report", description: "Today's bookings, revenue, and occupancy across all cinemas." },
  { key: "box-office-performance", label: "Box Office Performance", description: "Revenue and ticket counts by movie, plus a 14-day revenue trend." },
  { key: "revenue-by-branch", label: "Revenue By Branch", description: "Confirmed booking revenue and ticket volume split by cinema location." },
  { key: "bookings-by-genre", label: "Bookings By Genre", description: "Revenue and ticket counts grouped by each movie's primary genre." },
  { key: "cinema-reviews", label: "Cinema Reviews", description: "Review moderation status and average rating per movie." },
  { key: "promo-code-usage", label: "Promo Code Usage", description: "Redemption count and total discount given per promo code." },
  { key: "space-requests", label: "Space Requests", description: "Private hall/event booking enquiries by status." },
  { key: "admin-actions-by-user", label: "Admin Actions By User", description: "Audit log activity grouped by staff member." },
];

export function getReportDefinition(key: string): ReportDefinition | undefined {
  return REPORT_DEFINITIONS.find((r) => r.key === key);
}
