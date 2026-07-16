import { getSession } from "@/lib/auth";
import { getSelectedLocationId } from "@/lib/location-session";
import { prisma } from "@/lib/prisma";
import { HeaderClient } from "@/components/header-client";

export async function SiteHeader() {
  const [session, locationId] = await Promise.all([getSession(), getSelectedLocationId()]);
  const branch = locationId ? await prisma.branch.findUnique({ where: { id: locationId } }) : null;

  return <HeaderClient session={session} cityName={branch?.city ?? null} />;
}
