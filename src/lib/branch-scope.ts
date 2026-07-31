import "server-only";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type BranchScope = { isCircuitAdmin: boolean; branchId: string | null };

/**
 * Non-CircuitAdmin staff are locked to their own assigned cinema and can never
 * view or switch to another location's data, regardless of query params —
 * enforced here (server-side) rather than trusting the UI to hide a switcher.
 */
export async function getBranchScope(): Promise<BranchScope> {
  const session = await getSession();
  if (!session) return { isCircuitAdmin: false, branchId: null };
  if (session.role === "CIRCUIT_ADMIN") return { isCircuitAdmin: true, branchId: null };

  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { branchId: true } });
  return { isCircuitAdmin: false, branchId: me?.branchId ?? null };
}

/** CircuitAdmin can request any branch (or none, for "all locations"); everyone else is forced to their own. */
export function resolveScopedBranchId(scope: BranchScope, requested?: string): string | undefined {
  if (scope.isCircuitAdmin) return requested;
  return scope.branchId ?? undefined;
}

/**
 * Server-action guard: rejects a mutation targeting a branch the caller isn't
 * CircuitAdmin and isn't assigned to — protects against a tampered/hand-crafted
 * form submission, not just the UI hiding the switcher.
 */
export async function assertBranchAccess(sessionSub: string, role: string, targetBranchId: string): Promise<string | null> {
  if (role === "CIRCUIT_ADMIN") return null;
  const me = await prisma.user.findUnique({ where: { id: sessionSub }, select: { branchId: true } });
  if (me?.branchId !== targetBranchId) return "You can only manage your own cinema's data.";
  return null;
}

/** Same guard, for actions that target another staff member rather than a branch-owned record. */
export async function assertStaffTargetAccess(sessionSub: string, role: string, targetStaffId: string): Promise<string | null> {
  if (role === "CIRCUIT_ADMIN") return null;
  const [me, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: sessionSub }, select: { branchId: true } }),
    prisma.user.findUnique({ where: { id: targetStaffId }, select: { branchId: true } }),
  ]);
  if (!target || target.branchId !== me?.branchId) return "You can only manage staff at your own cinema.";
  return null;
}
