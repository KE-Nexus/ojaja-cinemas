import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasClaim } from "@/lib/claims";
import { LoyaltyTierForm } from "@/components/admin/loyalty-tier-form";
import { LoyaltyRewardForm } from "@/components/admin/loyalty-reward-form";
import { LoyaltyRewardToggle } from "@/components/admin/loyalty-reward-toggle";
import { LoyaltyRedeemForm } from "@/components/admin/loyalty-redeem-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteLoyaltyTierAction, deleteLoyaltyRewardAction } from "@/actions/admin/loyalty";
import { formatShowtime } from "@/lib/format";

export default async function LoyaltyPlusPage({ searchParams }: { searchParams: Promise<{ userId?: string }> }) {
  const session = await getSession();
  if (!session || !(await hasClaim(session.role, "CAN_ACCESS_LOYALTY_PLUS"))) redirect("/admin");

  const { userId } = await searchParams;

  const [tiers, rewards, recentRedemptions] = await Promise.all([
    prisma.loyaltyTier.findMany({ orderBy: { minPoints: "asc" } }),
    prisma.loyaltyReward.findMany({ orderBy: { pointsCost: "asc" } }),
    prisma.loyaltyRedemption.findMany({
      include: { user: true, reward: true, redeemedBy: true },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Loyalty Plus</h1>
        <p className="text-sm text-muted">Manage tiers, the reward catalog, and redeem points on a customer&apos;s behalf.</p>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-semibold">Redeem a reward</h2>
        <LoyaltyRedeemForm rewards={rewards.filter((r) => r.isActive)} defaultUserId={userId} />
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-semibold">Loyalty tiers</h2>
        <ul className="mb-4 space-y-2 text-sm">
          {tiers.map((t) => (
            <li key={t.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <span>
                <span className="font-medium">{t.name}</span> · {t.minPoints}+ pts
                {t.perks && <span className="text-muted"> · {t.perks}</span>}
              </span>
              <DeleteButton action={deleteLoyaltyTierAction.bind(null, t.id)} confirmText={`Delete tier "${t.name}"?`} />
            </li>
          ))}
          {tiers.length === 0 && <li className="text-muted">No tiers yet.</li>}
        </ul>
        <LoyaltyTierForm />
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-semibold">Reward catalog</h2>
        <ul className="mb-4 space-y-2 text-sm">
          {rewards.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <span>
                <span className="font-medium">{r.name}</span> · {r.pointsCost} pts
                {r.description && <span className="text-muted"> · {r.description}</span>}
              </span>
              <div className="flex items-center gap-3">
                <LoyaltyRewardToggle id={r.id} isActive={r.isActive} />
                <DeleteButton action={deleteLoyaltyRewardAction.bind(null, r.id)} confirmText={`Delete reward "${r.name}"?`} />
              </div>
            </li>
          ))}
          {rewards.length === 0 && <li className="text-muted">No rewards yet.</li>}
        </ul>
        <LoyaltyRewardForm />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-semibold">Recent redemptions</h2>
        <ul className="space-y-1.5 text-sm text-muted">
          {recentRedemptions.map((r) => (
            <li key={r.id}>
              {r.user.name} redeemed {r.reward.name} for {r.pointsSpent} pts · by {r.redeemedBy.name} · {formatShowtime(r.createdAt)}
            </li>
          ))}
          {recentRedemptions.length === 0 && <li>No redemptions yet.</li>}
        </ul>
      </div>
    </div>
  );
}
