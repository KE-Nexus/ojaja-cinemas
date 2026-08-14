"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSchedulingActions } from "@/components/admin/scheduling-provider";

export function CreateSessionButton() {
  const { openCreateModal } = useSchedulingActions();
  return (
    <Button onClick={() => openCreateModal()}>
      <Plus size={16} /> Create Session
    </Button>
  );
}
