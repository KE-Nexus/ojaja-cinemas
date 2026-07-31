"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { SeatCategory } from "@prisma/client";
import { ToggleSwitch } from "@/components/admin/toggle-switch";
import { setSeatClassSubscriptionAction } from "@/actions/admin/seat-class-subscriptions";

const CATEGORIES: SeatCategory[] = ["STANDARD", "PREMIUM", "RECLINER", "ACCESSIBLE"];

export function SeatClassSubscriptionsForm({ subscribed }: { subscribed: SeatCategory[] }) {
  const [active, setActive] = useState(new Set(subscribed));

  return (
    <ul className="space-y-2">
      {CATEGORIES.map((category) => (
        <li key={category} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
          <span className="capitalize">{category.toLowerCase()}</span>
          <ToggleSwitch
            checked={active.has(category)}
            onToggle={async () => {
              const nowSubscribed = !active.has(category);
              try {
                await setSeatClassSubscriptionAction(category, nowSubscribed);
                setActive((prev) => {
                  const next = new Set(prev);
                  if (nowSubscribed) next.add(category);
                  else next.delete(category);
                  return next;
                });
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Couldn't update subscription.");
              }
            }}
          />
        </li>
      ))}
    </ul>
  );
}
