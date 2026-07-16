import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Sign Up" };

export default function RegisterPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-20 sm:px-6">
      <h1 className="mb-1 font-sans text-2xl font-bold tracking-tight">Create Account</h1>
      <p className="mb-8 text-sm text-muted">Book faster and track your booking history.</p>
      <RegisterForm />
    </div>
  );
}
