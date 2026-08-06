import type { Metadata } from "next";
import { PosLoginForm } from "@/components/pos/pos-login-form";

export const metadata: Metadata = { title: "POS Login | OJAJA Cinemas" };

export default function PosLoginPage() {
  return <PosLoginForm />;
}
