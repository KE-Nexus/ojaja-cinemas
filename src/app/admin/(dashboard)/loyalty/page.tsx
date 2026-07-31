import Link from "next/link";
import { redirect } from "next/navigation";
import { Star, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasClaim } from "@/lib/claims";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoyaltyAdjustForm } from "@/components/admin/loyalty-adjust-form";
import { formatShowtime } from "@/lib/format";

export default async function LoyaltyPage({ searchParams }: { searchParams: Promise<{ q?: string; userId?: string }> }) {
  const session = await getSession();
  if (!session || !(await hasClaim(session.role, "CAN_ACCESS_LOYALTY"))) redirect("/admin");

  const { q, userId } = await searchParams;

  const results = q
    ? await prisma.user.findMany({
        where: { role: "CUSTOMER", OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] },
        take: 20,
        orderBy: { name: "asc" },
      })
    : [];

  const selected = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        include: { loyaltyAdjustmentsReceived: { include: { adjustedBy: true }, orderBy: { createdAt: "desc" }, take: 20 } },
      })
    : null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loyalty</h1>
          <p className="text-sm text-muted">View and adjust customer loyalty point balances.</p>
        </div>
        <Button href="/admin/loyalty/plus" variant="secondary">
          <Sparkles size={16} /> Loyalty Plus
        </Button>
      </div>

      <form method="get" className="mb-6 flex flex-wrap items-center gap-2">
        <Input name="q" defaultValue={q} placeholder="Search customer by name or email..." className="max-w-sm" />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {q && (
        <div className="mb-6 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Points</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {results.map((u) => (
                <tr key={u.id} className="border-b border-border/50">
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 text-muted">{u.email}</td>
                  <td className="p-3 text-muted">{u.loyaltyPoints}</td>
                  <td className="p-3">
                    <Link href={`/admin/loyalty?q=${encodeURIComponent(q)}&userId=${u.id}`} className="text-brand-light hover:underline">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-muted">
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{selected.name}</h2>
              <p className="text-xs text-muted">{selected.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-accent-gold/30 bg-accent-gold/10 px-4 py-2 text-sm text-accent-gold">
                <Star size={16} /> {selected.loyaltyPoints} points
              </div>
              <Link href={`/admin/loyalty/plus?userId=${selected.id}`} className="text-sm text-brand-light hover:underline">
                Redeem a reward
              </Link>
            </div>
          </div>

          <LoyaltyAdjustForm userId={selected.id} />

          <div className="mt-5 border-t border-border pt-4">
            <h3 className="mb-2 text-sm font-medium">Adjustment history</h3>
            <ul className="space-y-1.5 text-sm text-muted">
              {selected.loyaltyAdjustmentsReceived.map((a) => (
                <li key={a.id} className="flex items-center justify-between">
                  <span>
                    {a.reason} · by {a.adjustedBy.name} · {formatShowtime(a.createdAt)}
                  </span>
                  <span className={a.delta >= 0 ? "text-success" : "text-danger"}>
                    {a.delta >= 0 ? "+" : ""}
                    {a.delta}
                  </span>
                </li>
              ))}
              {selected.loyaltyAdjustmentsReceived.length === 0 && <li>No adjustments yet.</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
