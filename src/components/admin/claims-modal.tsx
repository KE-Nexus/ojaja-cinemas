"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { addClaimsToRoleAction, removeClaimsFromRoleAction } from "@/actions/admin/roles";
import { Button } from "@/components/ui/button";
import type { Role } from "@prisma/client";

type Claim = { id: string; key: string; label: string };

export function ClaimsModal({
  role,
  roleLabel,
  claims,
  mode,
  onClose,
}: {
  role: Role;
  roleLabel: string;
  claims: Claim[];
  mode: "add" | "remove";
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    if (selected.size === 0) {
      toast.error("Select at least one claim.");
      return;
    }
    startTransition(async () => {
      try {
        const ids = Array.from(selected);
        if (mode === "add") await addClaimsToRoleAction(role, ids);
        else await removeClaimsFromRoleAction(role, ids);
        toast.success(mode === "add" ? "Claims added." : "Claims removed.");
        onClose();
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">
            {mode === "add" ? "Add" : "Remove"} claims {mode === "add" ? "to" : "from"} role {roleLabel}
          </h3>
          <button onClick={onClose} className="text-muted hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface-2">
              <tr className="text-left text-muted">
                <th className="p-2.5 font-medium">No.</th>
                <th className="p-2.5 font-medium">Claim</th>
                <th className="p-2.5 text-right font-medium">Selected</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c, i) => (
                <tr key={c.id} className="border-t border-border/50">
                  <td className="p-2.5 text-muted">{i + 1}</td>
                  <td className="p-2.5">{c.label}</td>
                  <td className="p-2.5 text-right">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                      className="h-4 w-4 accent-brand"
                    />
                  </td>
                </tr>
              ))}
              {claims.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-muted">
                    {mode === "add" ? "This role already has every claim." : "This role has no claims to remove."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Button className="mt-4 w-full" disabled={isPending} onClick={handleSubmit}>
          {isPending ? "Saving..." : "Submit"}
        </Button>
      </div>
    </div>
  );
}
