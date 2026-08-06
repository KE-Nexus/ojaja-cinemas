import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBranchScope, resolveScopedBranchId } from "@/lib/branch-scope";
import { CinemaSelectForm } from "@/components/admin/cinema-select-form";
import { HiveSettingsForm } from "@/components/admin/hive-settings-form";

export default async function HiveSettingsPage({ searchParams }: { searchParams: Promise<{ cinema?: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "SUPERVISOR" && session.role !== "CIRCUIT_ADMIN")) redirect("/admin");

  const { cinema } = await searchParams;
  const scope = await getBranchScope();

  const accessibleBranches = await prisma.branch.findMany({
    where: scope.isCircuitAdmin ? {} : { id: scope.branchId ?? "__none__" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  if (accessibleBranches.length === 0) {
    return <p className="text-muted">No cinema is assigned to your account yet.</p>;
  }

  const requestedBranchId = resolveScopedBranchId(scope, cinema);
  const selectedBranchId =
    requestedBranchId && accessibleBranches.some((b) => b.id === requestedBranchId) ? requestedBranchId : accessibleBranches[0].id;

  const [selectedBranch, promotionalImages, galleryImages] = await Promise.all([
    prisma.branch.findUniqueOrThrow({
      where: { id: selectedBranchId },
      select: { id: true, aboutUs: true, useFilmSchedule: true, logoUrl: true, address: true, phone: true, email: true },
    }),
    prisma.branchImage.findMany({
      where: { branchId: selectedBranchId, kind: "PROMOTIONAL" },
      orderBy: { position: "asc" },
      select: { id: true, dataUrl: true },
    }),
    prisma.branchImage.findMany({
      where: { branchId: selectedBranchId, kind: "GALLERY" },
      orderBy: { position: "asc" },
      select: { id: true, dataUrl: true },
    }),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-brand-light">
            <Settings size={19} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Hive Settings</h1>
            <p className="text-sm text-muted">Manage what each cinema&rsquo;s home page shows to visitors.</p>
          </div>
        </div>
        {scope.isCircuitAdmin ? (
          <CinemaSelectForm branches={accessibleBranches} selected={selectedBranchId} />
        ) : (
          <span className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted">{accessibleBranches[0].name}</span>
        )}
      </div>

      <HiveSettingsForm key={selectedBranchId} selectedBranch={selectedBranch} promotionalImages={promotionalImages} galleryImages={galleryImages} />
    </div>
  );
}
