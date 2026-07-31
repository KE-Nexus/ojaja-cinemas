"use client";

import { useState } from "react";
import { ClaimsModal } from "@/components/admin/claims-modal";
import type { Role } from "@prisma/client";

type Claim = { id: string; key: string; label: string };

export function RoleClaimsActions({
  role,
  roleLabel,
  claims,
  grantedClaimIds,
}: {
  role: Role;
  roleLabel: string;
  claims: Claim[];
  grantedClaimIds: string[];
}) {
  const [modal, setModal] = useState<"add" | "remove" | null>(null);
  const granted = new Set(grantedClaimIds);

  return (
    <>
      <div className="flex items-center justify-center gap-4 text-sm">
        <button type="button" onClick={() => setModal("add")} className="text-brand-light hover:underline">
          Add Claims
        </button>
        <button type="button" onClick={() => setModal("remove")} className="text-danger hover:underline">
          Remove Claims
        </button>
      </div>

      {modal && (
        <ClaimsModal
          role={role}
          roleLabel={roleLabel}
          claims={modal === "add" ? claims.filter((c) => !granted.has(c.id)) : claims.filter((c) => granted.has(c.id))}
          mode={modal}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
