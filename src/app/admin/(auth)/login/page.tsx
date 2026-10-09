import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Staff Login | OJAJA Admin" };

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Image
            src="/logo-mark.png"
            alt="OJAJA Cinemas"
            width={441}
            height={229}
            className="mx-auto h-12 w-auto"
            priority
          />
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">Office</p>
          <p className="mt-1 text-sm text-muted">Staff &amp; management portal</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <LoginForm variant="staff" />
        </div>
      </div>
    </div>
  );
}
