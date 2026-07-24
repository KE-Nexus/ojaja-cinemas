import type { Role } from "@prisma/client";

export type SessionPayload = {
  sub: string;
  role: Role;
  name: string;
  email: string;
};

const STAFF_ROLES: Role[] = ["TICKETER", "ACCOUNTANT", "SUPERVISOR", "TECHNICIAN", "AUDITOR", "CIRCUIT_ADMIN"];

export function isStaffRole(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}
