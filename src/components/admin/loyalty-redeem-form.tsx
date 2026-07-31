"use client";

import { useActionState } from "react";
import { redeemLoyaltyRewardAction, type FormState } from "@/actions/admin/loyalty";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";

export function LoyaltyRedeemForm({
  rewards,
  defaultUserId,
}: {
  rewards: { id: string; name: string; pointsCost: number }[];
  defaultUserId?: string;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(redeemLoyaltyRewardAction, null);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="userId">Customer ID</Label>
          <Input id="userId" name="userId" defaultValue={defaultUserId} placeholder="Find the ID via the Loyalty search page" required />
        </div>
        <div>
          <Label htmlFor="rewardId">Reward</Label>
          <Select id="rewardId" name="rewardId" defaultValue="" required>
            <option value="" disabled>
              Select reward
            </option>
            {rewards.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.pointsCost} pts)
              </option>
            ))}
          </Select>
        </div>
      </div>
      {state?.error && <FieldError>{state.error}</FieldError>}
      <Button type="submit" size="sm" disabled={isPending || rewards.length === 0}>
        {isPending ? "Redeeming..." : "Redeem"}
      </Button>
    </form>
  );
}
