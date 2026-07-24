"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { filmContractSchema } from "@/lib/validation";

export type FormState = { error?: string } | null;

function parseForm(formData: FormData) {
  return filmContractSchema.safeParse({
    branchId: formData.get("branchId"),
    movieId: formData.get("movieId"),
    contractStartDate: formData.get("contractStartDate"),
  });
}

export async function createFilmContractAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const contract = await prisma.filmContract.create({
    data: { ...parsed.data, contractStartDate: new Date(parsed.data.contractStartDate) },
  });

  await logAdminAction(session.sub, "CREATE", "FilmContract", contract.id);
  revalidatePath("/admin/movies/contracts");
  redirect("/admin/movies/contracts");
}

export async function updateFilmContractAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const id = String(formData.get("id"));
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  await prisma.filmContract.update({
    where: { id },
    data: { ...parsed.data, contractStartDate: new Date(parsed.data.contractStartDate) },
  });

  await logAdminAction(session.sub, "UPDATE", "FilmContract", id);
  revalidatePath("/admin/movies/contracts");
  redirect("/admin/movies/contracts");
}

export async function deleteFilmContractAction(id: string) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  await prisma.filmContract.delete({ where: { id } });
  await logAdminAction(session.sub, "DELETE", "FilmContract", id);
  revalidatePath("/admin/movies/contracts");
}
