import "server-only";
import { cookies } from "next/headers";

export const LOCATION_COOKIE = "ojaja_location";

export async function getSelectedLocationId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(LOCATION_COOKIE)?.value ?? null;
}
