import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Reset Password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-20 sm:px-6">
      <h1 className="mb-1 font-sans text-2xl font-bold tracking-tight">Reset Password</h1>
      <p className="mb-8 text-sm text-muted">Choose a new password for your account.</p>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-sm text-danger">Missing or invalid reset link.</p>
      )}
    </div>
  );
}
