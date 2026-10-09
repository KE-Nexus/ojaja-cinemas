"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { distributorSchema } from "@/lib/validation";

export type FormState = { error?: string; success?: boolean } | null;

function parseForm(formData: FormData) {
  return distributorSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
}

export async function createDistributorAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["CIRCUIT_ADMIN"]);
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const distributor = await prisma.distributor.create({ data: parsed.data });

  await logAdminAction(session.sub, "CREATE", "Distributor", distributor.id, { name: distributor.name });
  revalidatePath("/admin/distributors");
  return { success: true };
}

export async function updateDistributorAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["CIRCUIT_ADMIN"]);
  const id = String(formData.get("id"));
  const existing = await prisma.distributor.findUnique({ where: { id } });
  if (!existing) return { error: "Distributor not found." };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  await prisma.distributor.update({ where: { id }, data: parsed.data });

  await logAdminAction(session.sub, "UPDATE", "Distributor", id, { name: parsed.data.name });
  revalidatePath("/admin/distributors");
  return { success: true };
}

export async function deleteDistributorAction(id: string) {
  const session = await requireRole(["CIRCUIT_ADMIN"]);

  const movieCount = await prisma.movie.count({ where: { distributorId: id } });
  if (movieCount > 0) {
    throw new Error(`This distributor is attached to ${movieCount} movie${movieCount === 1 ? "" : "s"} — reassign or remove them first.`);
  }

  await prisma.distributor.delete({ where: { id } });
  await logAdminAction(session.sub, "DELETE", "Distributor", id);
  revalidatePath("/admin/distributors");
}
