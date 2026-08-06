"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { ticketClassSchema, ticketPackageLineSchema, ticketPackageItemLineSchema } from "@/lib/validation";
import { assertBranchAccess } from "@/lib/branch-scope";
import { assertHasClaim } from "@/lib/claims";

export type FormState = { error?: string } | null;

function parseForm(formData: FormData) {
  return ticketClassSchema.safeParse({
    branchId: formData.get("branchId"),
    description: formData.get("description"),
    type: formData.get("type"),
    kind: formData.get("kind"),
    seatClass: formData.get("seatClass") || "",
    defaultPrice: formData.get("defaultPrice"),
    salesTaxPercent: formData.get("salesTaxPercent") || 0,
    isActive: formData.get("isActive") === "true",
    isLoyaltyTicket: formData.get("isLoyaltyTicket") === "true",
    isComplementary: formData.get("isComplementary") === "on",
    salesSources: formData.getAll("salesSources"),
  });
}

/** Parses the "Tickets" bundle rows and validates every referenced ticket is a same-branch, non-package type. */
async function parsePackageTicketLines(formData: FormData, branchId: string, packageId?: string) {
  const ids = formData.getAll("ticketLineId").map(String);
  const quantities = formData.getAll("ticketLineQuantity").map(String);
  const lines: { ticketClassId: string; quantity: number }[] = [];

  for (let i = 0; i < ids.length; i++) {
    if (!ids[i]) continue;
    const parsed = ticketPackageLineSchema.safeParse({ ticketClassId: ids[i], quantity: quantities[i] });
    if (!parsed.success) return { error: "Please check the bundled ticket lines." as string | null, lines: null };
    if (packageId && parsed.data.ticketClassId === packageId) return { error: "A package can't include itself.", lines: null };
    lines.push(parsed.data);
  }

  if (lines.length === 0) return { error: null, lines };

  const referenced = await prisma.ticketClass.findMany({ where: { id: { in: lines.map((l) => l.ticketClassId) } } });
  if (referenced.length !== new Set(lines.map((l) => l.ticketClassId)).size) return { error: "One or more bundled tickets couldn't be found.", lines: null };
  if (referenced.some((t) => t.branchId !== branchId)) return { error: "Bundled tickets must belong to the same cinema.", lines: null };
  if (referenced.some((t) => t.kind === "PACKAGE")) return { error: "A package can only bundle Standard tickets, not other packages.", lines: null };

  return { error: null, lines };
}

async function parsePackageItemLines(formData: FormData, branchId: string) {
  const ids = formData.getAll("itemLineId").map(String);
  const quantities = formData.getAll("itemLineQuantity").map(String);
  const lines: { posItemId: string; quantity: number }[] = [];

  for (let i = 0; i < ids.length; i++) {
    if (!ids[i]) continue;
    const parsed = ticketPackageItemLineSchema.safeParse({ posItemId: ids[i], quantity: quantities[i] });
    if (!parsed.success) return { error: "Please check the bundled item lines." as string | null, lines: null };
    lines.push(parsed.data);
  }

  if (lines.length === 0) return { error: null, lines };

  const referenced = await prisma.posItem.findMany({ where: { id: { in: lines.map((l) => l.posItemId) } } });
  if (referenced.length !== new Set(lines.map((l) => l.posItemId)).size) return { error: "One or more bundled items couldn't be found.", lines: null };
  if (referenced.some((it) => it.branchId && it.branchId !== branchId)) return { error: "Bundled items must belong to the same cinema.", lines: null };

  return { error: null, lines };
}

export async function createTicketClassAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_UPDATE_PRICECARDS");
  if (claimError) return { error: claimError };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const accessError = await assertBranchAccess(session.sub, session.role, parsed.data.branchId);
  if (accessError) return { error: accessError };

  let ticketLines: { ticketClassId: string; quantity: number }[] = [];
  let itemLines: { posItemId: string; quantity: number }[] = [];
  if (parsed.data.kind === "PACKAGE") {
    const ticketResult = await parsePackageTicketLines(formData, parsed.data.branchId);
    if (ticketResult.error) return { error: ticketResult.error };
    ticketLines = ticketResult.lines ?? [];

    const itemResult = await parsePackageItemLines(formData, parsed.data.branchId);
    if (itemResult.error) return { error: itemResult.error };
    itemLines = itemResult.lines ?? [];
  }

  const ticket = await prisma.ticketClass.create({
    data: {
      branchId: parsed.data.branchId,
      description: parsed.data.description,
      type: parsed.data.type,
      kind: parsed.data.kind,
      seatClass: parsed.data.seatClass || null,
      defaultPrice: parsed.data.defaultPrice,
      salesTaxPercent: parsed.data.salesTaxPercent,
      isActive: parsed.data.isActive,
      isLoyaltyTicket: Boolean(parsed.data.isLoyaltyTicket),
      isComplementary: parsed.data.kind === "STANDARD" || parsed.data.kind === "VOUCHER" ? Boolean(parsed.data.isComplementary) : false,
      salesSources: parsed.data.salesSources,
      packageTicketLines: { create: ticketLines },
      packageItemLines: { create: itemLines },
    },
  });

  await logAdminAction(session.sub, "CREATE", "TicketClass", ticket.id);
  revalidatePath("/admin/movies/tickets");
  redirect("/admin/movies/tickets");
}

export async function updateTicketClassAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_UPDATE_PRICECARDS");
  if (claimError) return { error: claimError };

  const id = String(formData.get("id"));
  const existing = await prisma.ticketClass.findUnique({ where: { id } });
  if (!existing) return { error: "Ticket not found." };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const accessError = await assertBranchAccess(session.sub, session.role, parsed.data.branchId);
  if (accessError) return { error: accessError };

  // A ticket's kind (Package vs Standard) is fixed at creation — the form disables the field,
  // and the server ignores anything submitted for it rather than trusting a tampered request.
  const kind = existing.kind;

  let ticketLines: { ticketClassId: string; quantity: number }[] = [];
  let itemLines: { posItemId: string; quantity: number }[] = [];
  if (kind === "PACKAGE") {
    const ticketResult = await parsePackageTicketLines(formData, parsed.data.branchId, id);
    if (ticketResult.error) return { error: ticketResult.error };
    ticketLines = ticketResult.lines ?? [];

    const itemResult = await parsePackageItemLines(formData, parsed.data.branchId);
    if (itemResult.error) return { error: itemResult.error };
    itemLines = itemResult.lines ?? [];
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticketClass.update({
      where: { id },
      data: {
        branchId: parsed.data.branchId,
        description: parsed.data.description,
        type: parsed.data.type,
        seatClass: parsed.data.seatClass || null,
        defaultPrice: parsed.data.defaultPrice,
        salesTaxPercent: parsed.data.salesTaxPercent,
        isActive: parsed.data.isActive,
        isLoyaltyTicket: Boolean(parsed.data.isLoyaltyTicket),
        isComplementary: kind === "STANDARD" || kind === "VOUCHER" ? Boolean(parsed.data.isComplementary) : false,
        salesSources: parsed.data.salesSources,
      },
    });

    if (kind === "PACKAGE") {
      await tx.ticketPackageLine.deleteMany({ where: { packageId: id } });
      await tx.ticketPackageItemLine.deleteMany({ where: { packageId: id } });
      if (ticketLines.length > 0) {
        await tx.ticketPackageLine.createMany({ data: ticketLines.map((l) => ({ packageId: id, ...l })) });
      }
      if (itemLines.length > 0) {
        await tx.ticketPackageItemLine.createMany({ data: itemLines.map((l) => ({ packageId: id, ...l })) });
      }
    }
  });

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
