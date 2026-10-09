"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { languageSchema } from "@/lib/validation";

export type FormState = { error?: string; success?: boolean } | null;

export async function createLanguageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["CIRCUIT_ADMIN"]);
  const parsed = languageSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const existing = await prisma.language.findFirst({ where: { name: { equals: parsed.data.name, mode: "insensitive" } } });
  if (existing) return { error: "A language with this name already exists." };

  const language = await prisma.language.create({ data: { name: parsed.data.name } });

  await logAdminAction(session.sub, "CREATE", "Language", language.id, { name: language.name });
  revalidatePath("/admin/languages");
  return { success: true };
}

export async function toggleLanguageAction(id: string) {
  const session = await requireRole(["CIRCUIT_ADMIN"]);
  const language = await prisma.language.findUnique({ where: { id } });
  if (!language) return;
  await prisma.language.update({ where: { id }, data: { isActive: !language.isActive } });
  await logAdminAction(session.sub, "UPDATE", "Language", id, { isActive: !language.isActive });
  revalidatePath("/admin/languages");
}

export async function deleteLanguageAction(id: string) {
  const session = await requireRole(["CIRCUIT_ADMIN"]);
  await prisma.language.delete({ where: { id } });
  await logAdminAction(session.sub, "DELETE", "Language", id);
  revalidatePath("/admin/languages");
}
