import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

// The fixed claim catalog, matching the reference "Add claims to role" screen exactly.
export const CLAIM_DEFINITIONS = [
  { key: "IS_CIRCUIT_STAFF", label: "Is Circuit Staff" },
  { key: "CAN_CREATE_APPROVE_STOCK_REQUEST", label: "Can Create And Approve Stock Request" },
  { key: "CAN_CREATE_APPROVE_STOCK_RECEIPT", label: "Can Create And Approve Stock Receipt" },
  { key: "CAN_CREATE_APPROVE_STOCK_TRANSFER_RECEIPT", label: "Can Create And Approve Stock Transfer Receipt" },
  { key: "CAN_APPROVE_PURCHASE_ORDER", label: "Can Approve Purchase Order" },
  { key: "CAN_REOPEN_SESSIONS", label: "Can ReOpen Sessions" },
  { key: "CAN_RESET_EMAIL", label: "Can Reset Email" },
  { key: "CAN_RESET_PASSWORD", label: "Can Reset Password" },
  { key: "CAN_CREATE_ROLES", label: "Can Create Roles" },
  { key: "CAN_CLOSE_SESSIONS", label: "Can Close Sessions" },
  { key: "CAN_MANUALLY_OPEN_POS_CASH_DRAWER", label: "Can Manually Open POS Cash Drawer" },
  { key: "CAN_REFUND_ON_POS", label: "Can Refund On POS" },
  { key: "CAN_SWAP_TICKETS", label: "Can Swap Tickets" },
  { key: "CAN_VIEW_SHOWTIMES", label: "Can View Showtimes" },
  { key: "CAN_UPDATE_SHOWTIMES", label: "Can Update Showtimes" },
  { key: "CAN_VIEW_PRICECARDS", label: "Can View PriceCards" },
  { key: "CAN_UPDATE_PRICECARDS", label: "Can Update PriceCards" },
  { key: "CAN_UPDATE_ITEMS", label: "Can Update Items" },
  { key: "CAN_REFUND_ORDERS", label: "Can Refund Orders" },
  { key: "CAN_VIEW_REPORTS", label: "Can View Reports" },
  { key: "CAN_UPDATE_CINEMA_BANK_ACCOUNT", label: "Can Update Cinema Bank Account" },
  { key: "CAN_ACCESS_OFFICE", label: "Can Access Office" },
  { key: "CAN_RESET_PIN", label: "Can Reset Pin" },
  { key: "IS_INTERNATIONAL_CIRCUIT_STAFF", label: "Is International Circuit Staff" },
  { key: "CAN_GET_SEAT_CLASS_NOTIFICATION", label: "Can Get Seat Class Notification" },
  { key: "CAN_ACCESS_LOYALTY", label: "Can Access Loyalty" },
  { key: "CAN_ACCESS_VGD", label: "Can Access VGD" },
  { key: "CAN_ACCESS_LOYALTY_PLUS", label: "Can Access Loyalty Plus" },
] as const;

export type ClaimKey = (typeof CLAIM_DEFINITIONS)[number]["key"];

/** Every claim now gates or drives a real feature in the app — see each claim's usage via assertHasClaim/hasClaim. */
export const WIRED_CLAIMS: ClaimKey[] = [
  "IS_CIRCUIT_STAFF",
  "CAN_CREATE_APPROVE_STOCK_REQUEST",
  "CAN_CREATE_APPROVE_STOCK_RECEIPT",
  "CAN_CREATE_APPROVE_STOCK_TRANSFER_RECEIPT",
  "CAN_APPROVE_PURCHASE_ORDER",
  "CAN_REOPEN_SESSIONS",
  "CAN_RESET_EMAIL",
  "CAN_RESET_PASSWORD",
  "CAN_CREATE_ROLES",
  "CAN_CLOSE_SESSIONS",
  "CAN_MANUALLY_OPEN_POS_CASH_DRAWER",
  "CAN_REFUND_ON_POS",
  "CAN_SWAP_TICKETS",
  "CAN_VIEW_SHOWTIMES",
  "CAN_UPDATE_SHOWTIMES",
  "CAN_VIEW_PRICECARDS",
  "CAN_UPDATE_PRICECARDS",
  "CAN_UPDATE_ITEMS",
  "CAN_REFUND_ORDERS",
  "CAN_VIEW_REPORTS",
  "CAN_UPDATE_CINEMA_BANK_ACCOUNT",
  "CAN_ACCESS_OFFICE",
  "CAN_RESET_PIN",
  "IS_INTERNATIONAL_CIRCUIT_STAFF",
  "CAN_GET_SEAT_CLASS_NOTIFICATION",
  "CAN_ACCESS_LOYALTY",
  "CAN_ACCESS_VGD",
  "CAN_ACCESS_LOYALTY_PLUS",
];

const ALL_KEYS = CLAIM_DEFINITIONS.map((c) => c.key);
const OFFICE_BASICS: ClaimKey[] = ["IS_CIRCUIT_STAFF", "CAN_ACCESS_OFFICE", "CAN_VIEW_SHOWTIMES"];

/** Sensible starting grants per role — mirrors the role gates already hardcoded across admin actions. */
export const DEFAULT_ROLE_CLAIMS: Record<Role, ClaimKey[]> = {
  CUSTOMER: [],
  CIRCUIT_ADMIN: ALL_KEYS,
  SUPERVISOR: [
    ...OFFICE_BASICS,
    "CAN_UPDATE_SHOWTIMES",
    "CAN_VIEW_PRICECARDS",
    "CAN_UPDATE_PRICECARDS",
    "CAN_UPDATE_ITEMS",
    "CAN_VIEW_REPORTS",
    "CAN_CLOSE_SESSIONS",
    "CAN_REOPEN_SESSIONS",
    "CAN_MANUALLY_OPEN_POS_CASH_DRAWER",
    "CAN_REFUND_ON_POS",
    "CAN_REFUND_ORDERS",
    "CAN_RESET_EMAIL",
    "CAN_RESET_PASSWORD",
    "CAN_RESET_PIN",
    "CAN_SWAP_TICKETS",
    "CAN_CREATE_APPROVE_STOCK_REQUEST",
    "CAN_CREATE_APPROVE_STOCK_RECEIPT",
    "CAN_CREATE_APPROVE_STOCK_TRANSFER_RECEIPT",
    "CAN_ACCESS_LOYALTY",
    "CAN_ACCESS_LOYALTY_PLUS",
    "CAN_ACCESS_VGD",
    "CAN_GET_SEAT_CLASS_NOTIFICATION",
  ],
  TICKETER: [
    ...OFFICE_BASICS,
    "CAN_MANUALLY_OPEN_POS_CASH_DRAWER",
    "CAN_REFUND_ON_POS",
    "CAN_SWAP_TICKETS",
    "CAN_VIEW_PRICECARDS",
    "CAN_ACCESS_LOYALTY",
  ],
  ACCOUNTANT: [
    ...OFFICE_BASICS,
    "CAN_VIEW_REPORTS",
    "CAN_VIEW_PRICECARDS",
    "CAN_UPDATE_CINEMA_BANK_ACCOUNT",
    "CAN_APPROVE_PURCHASE_ORDER",
    "CAN_ACCESS_LOYALTY",
    "CAN_ACCESS_VGD",
  ],
  TECHNICIAN: [...OFFICE_BASICS, "CAN_GET_SEAT_CLASS_NOTIFICATION"],
  AUDITOR: [...OFFICE_BASICS, "CAN_VIEW_REPORTS"],
  DRIVER: ["CAN_ACCESS_OFFICE", "IS_CIRCUIT_STAFF"],
};

/** CircuitAdmin is always granted every claim — misconfiguring claims can never lock them out. */
export async function hasClaim(role: Role, claimKey: ClaimKey): Promise<boolean> {
  if (role === "CIRCUIT_ADMIN") return true;
  const claim = await prisma.claim.findUnique({ where: { key: claimKey } });
  if (!claim) return false;
  const grant = await prisma.roleClaim.findUnique({ where: { role_claimId: { role, claimId: claim.id } } });
  return Boolean(grant);
}

/** Returns an error message if the role lacks the claim, or null if it's granted — mirrors assertBranchAccess. */
export async function assertHasClaim(role: Role, claimKey: ClaimKey): Promise<string | null> {
  if (await hasClaim(role, claimKey)) return null;
  const label = CLAIM_DEFINITIONS.find((c) => c.key === claimKey)?.label ?? claimKey;
  return `Your role doesn't have the "${label}" permission.`;
}

/** Every claim key currently granted to a role — used to drive UI (e.g. sidebar nav) that must reflect live claim state. */
export async function getGrantedClaimKeys(role: Role): Promise<ClaimKey[]> {
  if (role === "CIRCUIT_ADMIN") return ALL_KEYS;
  const grants = await prisma.roleClaim.findMany({ where: { role }, include: { claim: true } });
  return grants.map((g) => g.claim.key as ClaimKey);
}
