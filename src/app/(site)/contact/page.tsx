import type { Metadata } from "next";
import { Mail, Phone, MapPin } from "lucide-react";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = { title: "Contact Us" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="font-sans text-3xl font-bold tracking-tight">Contact Us</h1>
      <p className="mt-2 text-muted">Questions about a booking, a screen, or an event? We&rsquo;re here to help.</p>

      <div className="mt-10 grid gap-8 sm:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4 text-sm text-muted">
          <p className="flex items-center gap-2">
            <Mail size={16} /> support@ojaja.reachcinema.io
          </p>
          <p className="flex items-center gap-2">
            <Phone size={16} /> +234 36 700 1000
          </p>
          <p className="flex items-start gap-2">
            <MapPin size={16} className="mt-0.5" /> African Village @ Ife Grand Resort, Ile-Ife, Osun State
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
