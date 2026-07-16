import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "House Rules" };

const RULES = [
  {
    title: "Dress Code",
    body: "Smart casual attire is required in all auditoriums. Vests, flip-flops, and beachwear are not permitted for evening screenings (after 6pm) at our Lagos and Akure locations.",
  },
  {
    title: "Age Classification",
    body: "Guests must meet the minimum age for a film's classification. Valid ID may be requested at the box office or auditorium entrance for 15 and 18-rated titles.",
  },
  {
    title: "Outside Food & Drink",
    body: "Outside food and beverages are not permitted. Concessions are available at every location.",
  },
  {
    title: "Phones & Recording",
    body: "Please silence phones before the film starts. Recording or photographing the screen is strictly prohibited and may result in removal without refund.",
  },
  {
    title: "Latecomers",
    body: "Guests arriving more than 15 minutes after a showtime may be asked to wait for a suitable break in the film to avoid disturbing other guests.",
  },
  {
    title: "Accessibility",
    body: "Wheelchair-accessible seating is available in every auditorium — select an Accessible seat during booking or ask our box office team for assistance.",
  },
];

export default function HouseRulesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <ShieldCheck size={28} className="text-brand-light" />
        <h1 className="font-sans text-3xl font-bold tracking-tight">House Rules</h1>
      </div>
      <p className="mb-8 text-muted">A few things we ask every guest to keep in mind for a great experience.</p>

      <div className="space-y-6">
        {RULES.map((r) => (
          <div key={r.title} className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-1.5 font-semibold">{r.title}</h2>
            <p className="text-sm text-muted">{r.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
