import { prisma } from "@/lib/prisma";
import { getSelectedLocationId } from "@/lib/location-session";
import { LocationGate } from "@/components/location-gate";
import { SiteHeader } from "@/components/site-header";
import { SiteSidebar } from "@/components/site-sidebar";
import { SiteFooter } from "@/components/site-footer";
import { AppToaster } from "@/components/app-toaster";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const selectedLocationId = await getSelectedLocationId();

  // The cookie can outlive the branch it points to (e.g. a database reset during
  // development generates fresh IDs) — treat a dangling reference as "no selection"
  // rather than silently rendering an empty, location-filtered site.
  const selectedBranch = selectedLocationId
    ? await prisma.branch.findUnique({ where: { id: selectedLocationId } })
    : null;

  if (!selectedBranch) {
    const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });
    return (
      <>
        <LocationGate
          locations={branches.map((b) => ({ id: b.id, name: b.name, city: b.city, address: `${b.address}, ${b.city}` }))}
        />
        <AppToaster />
      </>
    );
  }

  return (
    <>
      <SiteSidebar />
      <div className="flex flex-1 flex-col md:pl-56">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
      <AppToaster />
    </>
  );
}
