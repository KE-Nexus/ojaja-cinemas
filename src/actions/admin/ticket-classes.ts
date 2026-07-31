"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { ticketClassSchema } from "@/lib/validation";
import { assertBranchAccess } from "@/lib/branch-scope";
import { assertHasClaim } from "@/lib/claims";

export type FormState = { error?: string } | null;

function parseForm(formData: FormData) {
  return ticketClassSchema.safeParse({
    branchId: formData.get("branchId"),
    description: formData.get("description"),
    className: formData.get("className"),
    type: formData.get("type"),
    defaultPrice: formData.get("defaultPrice"),
  });
}

export async function createTicketClassAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_UPDATE_PRICECARDS");
  if (claimError) return { error: claimError };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const accessError = await assertBranchAccess(session.sub, session.role, parsed.data.branchId);
  if (accessError) return { error: accessError };

  const ticket = await prisma.ticketClass.create({ data: parsed.data });

  await logAdminAction(session.sub, "CREATE", "TicketClass", ticket.id);
  revalidatePath("/admin/movies/tickets");
  redirect("/admin/movies/tickets");
}

export async function updateTicketClassAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_UPDATE_PRICECARDS");
  if (claimError) return { error: claimError };

  const id = String(formData.get("id"));
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const accessError = await assertBranchAccess(session.sub, session.role, parsed.data.branchId);
  if (accessError) return { error: accessError };

  await prisma.ticketClass.update({ where: { id }, data: parsed.data });

  await logAdminAction(session.sub, "UPDATE", "TicketClass", id);
  revalidatePath("/admin/movies/tickets");
  redirect("/admin/movies/tickets");
}

export async function toggleTicketClassAction(id: string) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_UPDATE_PRICECARDS");
  if (claimError) throw new Error(claimError);

  const ticket = await prisma.ticketClass.findUnique({ where: { id } });
  if (!ticket) return;
  if (await assertBranchAccess(session.sub, session.role, ticket.branchId)) return;

  await prisma.ticketClass.update({ where: { id }, data: { isActive: !ticket.isActive } });
  await logAdminAction(session.sub, "UPDATE", "TicketClass", id, { isActive: !ticket.isActive });
  revalidatePath("/admin/movies/tickets");
}

export async function deleteTicketClassAction(id: string) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_UPDATE_PRICECARDS");
  if (claimError) throw new Error(claimError);

  const ticket = await prisma.ticketClass.findUnique({ where: { id } });
  if (!ticket) return;
  if (await assertBranchAccess(session.sub, session.role, ticket.branchId)) return;

  await prisma.ticketClass.delete({ where: { id } });
  await logAdminAction(session.sub, "DELETE", "TicketClass", id);
  revalidatePath("/admin/movies/tickets");
}
