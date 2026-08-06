"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Film,
  CalendarClock,
  CalendarRange,
  MapPin,
  Armchair,
  Ticket,
  TicketCheck,
  FileSignature,
  Star,
  PartyPopper,
  Tag,
  BarChart3,
  Users,
  ScrollText,
  Bell,
  LogOut,
  ExternalLink,
  Package,
  Warehouse,
  UserCog,
  CalendarDays,
  Wallet,
  ShieldCheck,
  ClipboardList,
  PackageCheck,
  ArrowLeftRight,
  ShoppingCart,
  Gift,
  Sparkles,
  Settings,
  CreditCard,
  Boxes,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import type { Role } from "@prisma/client";
import type { ClaimKey } from "@/lib/claims";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[] | null;
  /** Extra claim requirement for items whose destination page hard-gates on a claim. */
  claim?: ClaimKey;
  /** "or" means role-eligible OR claim-granted is enough (e.g. a page with two independent audiences). Default is "and". */
  claimMode?: "and" | "or";
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: null }],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/movies", label: "Movies", icon: Film, roles: null },
      { href: "/admin/movies/contracts", label: "Film Contracts", icon: FileSignature, roles: ["SUPERVISOR", "CIRCUIT_ADMIN"] },
      { href: "/admin/movies/tickets", label: "Tickets", icon: TicketCheck, roles: ["SUPERVISOR", "CIRCUIT_ADMIN"], claim: "CAN_VIEW_PRICECARDS" },
      {
        href: "/admin/movies/price-cards",
        label: "Price Cards",
        icon: CreditCard,
        roles: ["SUPERVISOR", "CIRCUIT_ADMIN"],
        claim: "CAN_VIEW_PRICECARDS",
      },
      { href: "/admin/showtimes", label: "Showtimes", icon: CalendarClock, roles: null, claim: "CAN_VIEW_SHOWTIMES" },
      { href: "/admin/scheduling", label: "Film Scheduling", icon: CalendarRange, roles: ["SUPERVISOR", "CIRCUIT_ADMIN"] },
      { href: "/admin/locations", label: "Locations", icon: MapPin, roles: ["SUPERVISOR", "CIRCUIT_ADMIN"] },
      { href: "/admin/auditoriums", label: "Auditoriums", icon: Armchair, roles: null },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/admin/bookings", label: "Bookings", icon: Ticket, roles: null },
      { href: "/admin/promo-codes", label: "Promo Codes", icon: Tag, roles: ["SUPERVISOR", "CIRCUIT_ADMIN", "ACCOUNTANT"] },
      { href: "/admin/vgd", label: "Vouchers, Gifts & Discounts", icon: Gift, roles: null, claim: "CAN_ACCESS_VGD" },
    ],
  },
  {
    label: "Loyalty",
    items: [
      { href: "/admin/loyalty", label: "Loyalty", icon: Star, roles: null, claim: "CAN_ACCESS_LOYALTY" },
      { href: "/admin/loyalty/plus", label: "Loyalty Plus", icon: Sparkles, roles: null, claim: "CAN_ACCESS_LOYALTY_PLUS" },
    ],
  },
  {
    label: "POS",
    items: [
      { href: "/admin/pos/stock-overview", label: "Stock Overview", icon: Boxes, roles: ["SUPERVISOR", "CIRCUIT_ADMIN"] },
      { href: "/admin/pos/ho-items", label: "HO Items", icon: Warehouse, roles: ["SUPERVISOR", "CIRCUIT_ADMIN"] },
      { href: "/admin/pos/items", label: "All Items", icon: Package, roles: ["SUPERVISOR", "CIRCUIT_ADMIN"] },
      { href: "/admin/pos/stock-requests", label: "Stock Requests", icon: ClipboardList, roles: null, claim: "CAN_CREATE_APPROVE_STOCK_REQUEST" },
      { href: "/admin/pos/stock-receipts", label: "Stock Receipts", icon: PackageCheck, roles: null, claim: "CAN_CREATE_APPROVE_STOCK_RECEIPT" },
      { href: "/admin/pos/stock-transfers", label: "Stock Transfers", icon: ArrowLeftRight, roles: null, claim: "CAN_CREATE_APPROVE_STOCK_TRANSFER_RECEIPT" },
      { href: "/admin/pos/purchase-orders", label: "Purchase Orders", icon: ShoppingCart, roles: ["SUPERVISOR", "CIRCUIT_ADMIN"] },
    ],
  },
  {
    label: "Engagement",
    items: [
      { href: "/admin/reviews", label: "Reviews", icon: Star, roles: null },
      { href: "/admin/space-requests", label: "Space Requests", icon: PartyPopper, roles: null },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/admin/reports", label: "Reports", icon: BarChart3, roles: ["SUPERVISOR", "CIRCUIT_ADMIN", "AUDITOR"], claim: "CAN_VIEW_REPORTS" },
      {
        href: "/admin/notifications",
        label: "Notifications",
        icon: Bell,
        roles: ["SUPERVISOR", "CIRCUIT_ADMIN"],
        claim: "CAN_GET_SEAT_CLASS_NOTIFICATION",
        claimMode: "or",
      },
    ],
  },
  {
    label: "Staff",
    items: [
      { href: "/admin/staff", label: "Staff", icon: UserCog, roles: ["SUPERVISOR", "CIRCUIT_ADMIN"] },
      { href: "/admin/staff/roster", label: "Roster", icon: CalendarDays, roles: ["SUPERVISOR", "CIRCUIT_ADMIN"] },
      { href: "/admin/staff/sessions", label: "Staff Sessions", icon: Wallet, roles: ["SUPERVISOR", "CIRCUIT_ADMIN"] },
      { href: "/admin/staff/roles", label: "Roles", icon: ShieldCheck, roles: ["CIRCUIT_ADMIN"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/users", label: "Users & Roles", icon: Users, roles: ["CIRCUIT_ADMIN"] },
      { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText, roles: ["SUPERVISOR", "CIRCUIT_ADMIN", "AUDITOR"] },
    ],
  },
  {
    label: "Settings",
    items: [{ href: "/admin/settings/hive", label: "Hive Settings", icon: Settings, roles: ["SUPERVISOR", "CIRCUIT_ADMIN"] }],
  },
];

export function AdminSidebar({ name, role, grantedClaims }: { name: string; role: Role; grantedClaims: ClaimKey[] }) {
  const pathname = usePathname();
  const granted = new Set(grantedClaims);

  function isVisible(item: NavItem): boolean {
    const roleOk = !item.roles || item.roles.includes(role);
    const claimOk = !item.claim || granted.has(item.claim);
    return item.claimMode === "or" ? roleOk || claimOk : roleOk && claimOk;
  }

  // Nested routes (e.g. /admin/movies/contracts under /admin/movies) share a path prefix
  // with their parent — only the most specific matching item should light up.
  const allHrefs = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));
  const bestMatch = allHrefs
    .filter((href) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <aside className="glass sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-white/5">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-5">
        <Image src="/logo-mark.png" alt="OJAJA Cinemas" width={441} height={229} className="h-8 w-auto" priority />
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Office</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter(isVisible);
          if (items.length === 0) return null;
          return (
            <div key={group.label} className="mb-4 last:mb-0">
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/70">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = item.href === bestMatch;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active ? "bg-brand/15 text-brand-light" : "text-muted hover:bg-white/5 hover:text-foreground"
                      )}
                    >
                      {active && (
                        <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[linear-gradient(180deg,var(--brand-light),var(--accent-cyan))]" />
                      )}
                      <Icon size={16} className="shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-white/5 p-3">
        <div className="flex items-center justify-between px-1">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-muted hover:bg-white/5 hover:text-foreground"
          >
            <ExternalLink size={16} /> View Site
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between rounded-lg px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="text-xs capitalize text-muted">{role.replace("_", " ").toLowerCase()}</p>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="text-muted hover:text-danger" aria-label="Sign out">
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
