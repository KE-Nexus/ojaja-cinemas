"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { branchSchema } from "@/lib/validation";

export type FormState = { error?: string } | null;

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
  const session = await requireRole(["MANAGER", "ADMIN"]);
  const parsed = parseBranchForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

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
    },
  });

  await logAdminAction(session.sub, "CREATE", "Branch", branch.id, { name: branch.name });
  revalidatePath("/admin/locations");
  redirect("/admin/locations");
}

export async function updateBranchAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["MANAGER", "ADMIN"]);
  const id = String(formData.get("id"));
  const parsed = parseBranchForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

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
    },
  });

  await logAdminAction(session.sub, "UPDATE", "Branch", id, { name: parsed.data.name });
  revalidatePath("/admin/locations");
  redirect("/admin/locations");
}

export async function deleteBranchAction(id: string) {
  const session = await requireRole(["ADMIN"]);
  await prisma.branch.delete({ where: { id } });
  await logAdminAction(session.sub, "DELETE", "Branch", id);
  revalidatePath("/admin/locations");
}
