"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOCATION_COOKIE } from "@/lib/location-session";

export async function selectLocationAction(branchId: string) {
  const cookieStore = await cookies();
  cookieStore.set(LOCATION_COOKIE, branchId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
    sameSite: "lax",
  });
  redirect("/");
}

export async function clearLocationAction() {
  const cookieStore = await cookies();
  cookieStore.delete(LOCATION_COOKIE);
  redirect("/");
}
