"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ToggleSwitch } from "@/components/admin/toggle-switch";
import { toggleTicketClassAction } from "@/actions/admin/ticket-classes";

export function TicketClassToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [checked, setChecked] = useState(isActive);

  return (
    <ToggleSwitch
      checked={checked}
      onToggle={async () => {
        try {
          await toggleTicketClassAction(id);
          setChecked((v) => !v);
        } catch {
          toast.error("Couldn't update status. Please try again.");
        }
      }}
    />
  );
}
