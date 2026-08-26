"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { assertBranchAccess } from "@/lib/branch-scope";
import { hiveSettingsSchema, branchContactSchema } from "@/lib/validation";

export type FormState = { error?: string; success?: boolean } | null;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const EXTENSION_MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  bmp: "image/bmp",
};

/**
 * Some browsers/OS combos leave `file.type` blank for formats their MIME database doesn't
 * recognize — JPEG usually isn't affected, but AVIF (and occasionally others) commonly are.
 * A blank `file.type` failed `.startsWith("image/")` and got rejected as "not an image", or
 * a JPEG saved from certain editors/cameras that strip MIME metadata hit the same gap — so
 * this falls back to the file extension whenever the browser doesn't supply a usable type.
 */
function resolveImageMimeType(file: File): string | null {
  if (file.type.startsWith("image/")) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext ? (EXTENSION_MIME_TYPES[ext] ?? null) : null;
}

async function fileToDataUrl(file: File, mimeType: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function validateImageFile(file: File): string | null {
  if (!resolveImageMimeType(file)) return `"${file.name}" isn't a recognized image file.`;
  if (file.size > MAX_IMAGE_BYTES) return `"${file.name}" is larger than 4MB.`;
  return null;
}

async function revalidateHiveSettings(branchId: string) {
  revalidatePath("/admin/settings/hive");
  revalidatePath("/locations");
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { slug: true } });
  if (branch) revalidatePath(`/locations/${branch.slug}`);
}

export async function updateHiveSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);

  const branchId = String(formData.get("branchId") ?? "");
  const metaParsed = hiveSettingsSchema.safeParse({
    branchId,
    aboutUs: formData.get("aboutUs") || "",
    useFilmSchedule: formData.get("useFilmSchedule") === "on",
  });
  if (!metaParsed.success) return { error: metaParsed.error.issues[0]?.message ?? "Please check the form." };

  const contactParsed = branchContactSchema.safeParse({
    address: formData.get("address"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
  });
  if (!contactParsed.success) return { error: contactParsed.error.issues[0]?.message ?? "Please check the location details." };

  const metaAccessError = await assertBranchAccess(session.sub, session.role, branchId);
  if (metaAccessError) return { error: metaAccessError };

  const logoFile = formData.get("logo");
  let logoUrl: string | undefined;
  if (logoFile instanceof File && logoFile.size > 0) {
    const err = validateImageFile(logoFile);
    if (err) return { error: err };
    logoUrl = await fileToDataUrl(logoFile, resolveImageMimeType(logoFile)!);
  }

  const promotionalFiles = formData.getAll("promotionalImages").filter((f): f is File => f instanceof File && f.size > 0);
  const galleryFiles = formData.getAll("galleryImages").filter((f): f is File => f instanceof File && f.size > 0);
  for (const f of [...promotionalFiles, ...galleryFiles]) {
    const err = validateImageFile(f);
    if (err) return { error: err };
  }

  await prisma.$transaction(async (tx) => {
    await tx.branch.update({
      where: { id: branchId },
      data: {
        aboutUs: metaParsed.data.aboutUs || null,
        useFilmSchedule: metaParsed.data.useFilmSchedule ?? false,
        address: contactParsed.data.address,
        phone: contactParsed.data.phone,
        email: contactParsed.data.email || null,
        ...(logoUrl ? { logoUrl } : {}),
      },
    });

    if (promotionalFiles.length > 0) {
      const startPosition = await tx.branchImage.count({ where: { branchId, kind: "PROMOTIONAL" } });
      for (const [i, f] of promotionalFiles.entries()) {
        await tx.branchImage.create({
          data: { branchId, kind: "PROMOTIONAL", dataUrl: await fileToDataUrl(f, resolveImageMimeType(f)!), position: startPosition + i },
        });
      }
    }

    if (galleryFiles.length > 0) {
      const startPosition = await tx.branchImage.count({ where: { branchId, kind: "GALLERY" } });
      for (const [i, f] of galleryFiles.entries()) {
        await tx.branchImage.create({
          data: { branchId, kind: "GALLERY", dataUrl: await fileToDataUrl(f, resolveImageMimeType(f)!), position: startPosition + i },
        });
      }
    }
  });

  await logAdminAction(session.sub, "UPDATE", "Branch", branchId, { section: "hive-settings" });
  await revalidateHiveSettings(branchId);
  return { success: true };
}

export async function deleteBranchImageAction(imageId: string) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);

  const image = await prisma.branchImage.findUnique({ where: { id: imageId } });
  if (!image) return;

  const accessError = await assertBranchAccess(session.sub, session.role, image.branchId);
  if (accessError) throw new Error(accessError);

  await prisma.branchImage.delete({ where: { id: imageId } });
  await logAdminAction(session.sub, "DELETE", "BranchImage", imageId);
  await revalidateHiveSettings(image.branchId);
}
