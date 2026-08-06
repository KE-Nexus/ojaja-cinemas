export type ReportDefinition = {
  key: string;
  label: string;
  description: string;
};

// Matches the circuit's standard report catalog. The four Nomba-branded reports reflect
// a payment-terminal integration this deployment doesn't have configured — they still
// appear in the list (so the catalog matches what staff expect to see) but say so plainly
// instead of fabricating transaction data.
export const REPORT_DEFINITIONS: ReportDefinition[] = [
  { key: "admin-actions-by-user", label: "Admin Actions By User", description: "Audit log activity grouped by staff member." },
  { key: "bookings-by-genre", label: "Bookings By Genre", description: "Revenue and ticket counts grouped by each movie's primary genre." },
  { key: "box-office-performance", label: "Box Office Performance", description: "Revenue and ticket counts by movie, plus a 14-day revenue trend." },
  { key: "cashier-session-reconciliation", label: "Cashier Session Reconciliation", description: "Declared vs. system-expected takings per closed staff session." },
  { key: "cashup-report", label: "Cashup Report", description: "Cash, card, transfer, and voucher totals declared at session close." },
  { key: "cinema-reviews", label: "Cinema Reviews", description: "Review moderation status and average rating per movie." },
  { key: "daily-operations", label: "Daily Operations Report", description: "Today's bookings, revenue, and occupancy across all cinemas." },
  { key: "distributor-by-film", label: "Distributor by Film", description: "Confirmed revenue and ticket volume grouped by film distributor." },
  { key: "film-by-screen", label: "Film By Screen", description: "Session counts and revenue per film, broken down by auditorium." },
  { key: "film-hire-report", label: "Film Hire Report", description: "Active film contracts by cinema and their contract start dates." },
  { key: "gbo-by-screen-type", label: "GBO By Screen Type", description: "Gross box office revenue grouped by auditorium screen type." },
  { key: "gbo-by-tickets", label: "GBO By Tickets", description: "Gross box office revenue grouped by seat/ticket category." },
  { key: "gbo-film-reports", label: "GBO Film Reports", description: "Gross box office revenue per film with average ticket price." },
  { key: "item-details-sales-report", label: "Item Details Sales Report", description: "Line-by-line concession sales — every item sold on every booking." },
  { key: "item-sales-report", label: "Item Sales Report", description: "Concession sales totals grouped by item." },
  { key: "marketing-report", label: "Marketing Report", description: "Promo code redemptions and review volume as a proxy for campaign reach." },
  { key: "nomba-connect-transaction-report", label: "Nomba Connect Transaction Report", description: "Transactions settled via Nomba Connect." },
  { key: "nomba-mobile-pos-transaction-report", label: "Nomba Mobile POS Transaction Report", description: "Transactions settled via Nomba mobile POS terminals." },
  { key: "nomba-pos-auto-reconciliation-report", label: "Nomba POS auto-reconciliation Report", description: "Automatic reconciliation of Nomba POS terminal settlements." },
  { key: "nomba-web-transaction-report", label: "Nomba Web Transaction Report", description: "Transactions settled via Nomba's web payment channel." },
  { key: "online-item-sales-report", label: "Online Item Sales Report", description: "Concession sales from customer self-service (non-box-office) bookings." },
  { key: "online-orders", label: "Online Orders", description: "Bookings placed by customers online rather than at the box office." },
  { key: "operations-report", label: "Operations Report", description: "Circuit-wide operating snapshot — cinemas, screens, and today's activity." },
  { key: "orders-by-source-and-channel", label: "Orders by Source And Channel", description: "Bookings split by box-office vs. online, and by payment method." },
  { key: "performance-by-film", label: "Performance By Film", description: "Occupancy rate and revenue per film across all its sessions." },
  { key: "performance-by-showtime", label: "Performance By Showtime", description: "Occupancy and revenue for every individual session." },
  { key: "performance-report", label: "Performance Report", description: "Circuit-wide KPI summary — revenue, admits, and occupancy by cinema." },
  { key: "refunds-report", label: "Refunds Reports", description: "Refunded bookings with amount, movie, and who processed them." },
  { key: "session-reconciliation", label: "Session Reconciliation", description: "Every staff session across the circuit with its open/close status." },
  { key: "settlement-report", label: "Settlement Report", description: "Successful payment settlements grouped by day and payment method." },
  { key: "showtime-booking-report", label: "Showtime Booking Report", description: "Booking and seat counts for every scheduled session." },
  { key: "showtimes-schedule", label: "Showtimes Schedule", description: "Upcoming session schedule across all cinemas." },
  { key: "staff-performance", label: "Staff Performance", description: "Bookings processed and revenue handled per staff member." },
  { key: "swapped-ticket-report", label: "Swapped Ticket Report", description: "Bookings that had their seats swapped, and who made the change." },
  { key: "ticket-sales-report", label: "Ticket Sales Report", description: "Ticket-only revenue (excluding concessions), grouped by movie." },
  { key: "transactions-by-user", label: "Transactions by user", description: "Payment activity grouped by the customer who paid." },
];

export function getReportDefinition(key: string): ReportDefinition | undefined {
  return REPORT_DEFINITIONS.find((r) => r.key === key);
}
