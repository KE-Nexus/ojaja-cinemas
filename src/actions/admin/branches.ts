"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { branchSchema, branchBankSchema } from "@/lib/validation";
import { assertHasClaim } from "@/lib/claims";

export type FormState = { error?: string } | null;

// Bank fields only render in the form when the viewer holds the claim, so their presence
// in formData signals intent to change them — absence means "leave untouched", not "clear".
async function parseBankFields(session: { role: import("@prisma/client").Role }, formData: FormData) {
  if (!formData.has("bankName") && !formData.has("bankAccountName") && !formData.has("bankAccountNumber")) {
    return { data: null, error: null as string | null };
  }
  const claimError = await assertHasClaim(session.role, "CAN_UPDATE_CINEMA_BANK_ACCOUNT");
  if (claimError) return { data: null, error: claimError };

  const parsed = branchBankSchema.safeParse({
    bankName: formData.get("bankName") || "",
    bankAccountName: formData.get("bankAccountName") || "",
    bankAccountNumber: formData.get("bankAccountNumber") || "",
  });
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Please check the bank details." };

  return {
    data: {
      bankName: parsed.data.bankName || null,
      bankAccountName: parsed.data.bankAccountName || null,
      bankAccountNumber: parsed.data.bankAccountNumber || null,
    },
    error: null,
  };
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseBranchForm(formData: FormData) {
  return branchSchema.safeParse({
    name: formData.get("name"),
    city: formData.get("city"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    openingHours: formData.get("openingHours"),
    lat: formData.get("lat") || "",
    lng: formData.get("lng") || "",
  });
}

export async function createBranchAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const parsed = parseBranchForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const bank = await parseBankFields(session, formData);
  if (bank.error) return { error: bank.error };

  const baseSlug = slugify(parsed.data.name);
  let slug = baseSlug;
  let n = 1;
  while (await prisma.branch.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++n}`;
  }

  const branch = await prisma.branch.create({
    data: {
      slug,
      name: parsed.data.name,
      city: parsed.data.city,
      address: parsed.data.address,
      phone: parsed.data.phone,
      openingHours: parsed.data.openingHours,
      lat: parsed.data.lat === "" ? null : parsed.data.lat,
      lng: parsed.data.lng === "" ? null : parsed.data.lng,
      ...bank.data,
    },
  });

  await logAdminAction(session.sub, "CREATE", "Branch", branch.id, { name: branch.name });
  revalidatePath("/admin/locations");
  redirect("/admin/locations");
}

export async function updateBranchAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const id = String(formData.get("id"));
  const parsed = parseBranchForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const bank = await parseBankFields(session, formData);
  if (bank.error) return { error: bank.error };

  await prisma.branch.update({
    where: { id },
    data: {
      name: parsed.data.name,
      city: parsed.data.city,
      address: parsed.data.address,
      phone: parsed.data.phone,
      openingHours: parsed.data.openingHours,
      lat: parsed.data.lat === "" ? null : parsed.data.lat,
      lng: parsed.data.lng === "" ? null : parsed.data.lng,
      ...bank.data,
    },
  });

  await logAdminAction(session.sub, "UPDATE", "Branch", id, { name: parsed.data.name });
  revalidatePath("/admin/locations");
  redirect("/admin/locations");
}

export async function deleteBranchAction(id: string) {
  const session = await requireRole(["CIRCUIT_ADMIN"]);
  await prisma.branch.delete({ where: { id } });
  await logAdminAction(session.sub, "DELETE", "Branch", id);
  revalidatePath("/admin/locations");
}
