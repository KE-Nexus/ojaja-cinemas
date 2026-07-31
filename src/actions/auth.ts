"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  createPasswordResetToken,
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
  verifyPasswordResetToken,
} from "@/lib/auth";
import { loginSchema, registerSchema } from "@/lib/validation";
import { notificationProvider } from "@/lib/providers/notification";

export type FormState = { error?: string; fieldErrors?: Record<string, string> } | null;

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      passwordHash,
      role: "CUSTOMER",
    },
  });

  await createSession({ sub: user.id, role: user.role, name: user.name, email: user.email });
  // Clears every cached route so a stale render from a previous session/role never leaks through.
  revalidatePath("/", "layout");
  redirect("/account");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  await createSession({ sub: user.id, role: user.role, name: user.name, email: user.email });
  // Clears every cached route so a stale render from a previous session/role never leaks through.
  revalidatePath("/", "layout");
  redirect(user.role === "CUSTOMER" ? "/account" : "/admin");
}

export async function logoutAction() {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function requestPasswordResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email address." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = await createPasswordResetToken(email);
    const link = `https://ojaja.reachcinema.io/reset-password?token=${token}`;
    await notificationProvider.sendEmail(
      email,
      "Reset your OJAJA Cinemas password",
      `Hi ${user.name}, click this link to reset your password: ${link} (valid for 30 minutes)`
    );
  }

  // Always respond the same way so we don't leak which emails have accounts.
  return { error: undefined, fieldErrors: undefined };
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return { fieldErrors: { password: "Password must be at least 8 characters" } };
  }

  const email = await verifyPasswordResetToken(token);
  if (!email) {
    return { error: "This reset link is invalid or has expired. Please request a new one." };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { email }, data: { passwordHash } });

  redirect("/login");
}
