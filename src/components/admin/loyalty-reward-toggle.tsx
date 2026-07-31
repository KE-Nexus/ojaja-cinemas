"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ToggleSwitch } from "@/components/admin/toggle-switch";
import { toggleLoyaltyRewardAction } from "@/actions/admin/loyalty";

export function LoyaltyRewardToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [checked, setChecked] = useState(isActive);

  return (
    <ToggleSwitch
      checked={checked}
      onToggle={async () => {
        try {
          await toggleLoyaltyRewardAction(id, !checked);
          setChecked((v) => !v);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Couldn't update status. Please try again.");
        }
      }}
    />
  );
}
