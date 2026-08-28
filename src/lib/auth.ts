import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import type { SessionPayload } from "@/lib/roles";

export type { SessionPayload } from "@/lib/roles";

const SESSION_COOKIE = "ojaja_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ role: payload.role, name: payload.name, email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const sub = payload.sub as string;

    // Role is re-read from the DB on every request rather than trusted from the JWT — the
    // token is only re-issued at login, so a role change (or a deactivation) made by an
    // admin would otherwise sit inert until the staff member's next login, even though the
    // admin UI already shows it as applied. This mirrors how branchId is handled in
    // branch-scope.ts (never trusted from a claim, always read fresh).
    const user = await prisma.user.findUnique({ where: { id: sub }, select: { role: true, isActive: true } });
    if (!user || !user.isActive) return null;

    return {
      sub,
      role: user.role,
      name: payload.name as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.sub } });
}

export async function requireSession(): Promise<SessionPayload> {
  // A signed session cookie can outlive its user record (e.g. after a database
  // reset/reseed generates fresh ids) or outlive the account being deactivated —
  // getSession() already returns null for both, so there's nothing left to check here
  // beyond bouncing to login when it does.
  const session = await getSession();
  if (!session) {
    await destroySession();
    redirect("/admin/login");
  }

  return session;
}

export async function requireRole(allowed: Role[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!allowed.includes(session.role)) throw new Error("FORBIDDEN");
  return session;
}

const RESET_TOKEN_TTL_SECONDS = 60 * 30; // 30 minutes

export async function createPasswordResetToken(email: string): Promise<string> {
  return new SignJWT({ purpose: "password-reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuedAt()
    .setExpirationTime(`${RESET_TOKEN_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.purpose !== "password-reset") return null;
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
