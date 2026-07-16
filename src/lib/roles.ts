import type { Role } from "@prisma/client";

export type SessionPayload = {
  sub: string;
  role: Role;
  name: string;
  email: string;
};

const STAFF_ROLES: Role[] = ["BOX_OFFICE", "MARKETING", "MANAGER", "ADMIN"];

export function isStaffRole(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}
