import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Log In" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-20 sm:px-6">
      <h1 className="mb-1 font-sans text-2xl font-bold tracking-tight">Welcome Back</h1>
      <p className="mb-8 text-sm text-muted">Log in to manage your bookings.</p>
      <LoginForm />
    </div>
  );
}
