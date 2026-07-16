import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-20 sm:px-6">
      <h1 className="mb-1 font-sans text-2xl font-bold tracking-tight">Forgot Password</h1>
      <p className="mb-8 text-sm text-muted">We&rsquo;ll email you a link to reset it.</p>
      <ForgotPasswordForm />
    </div>
  );
}
