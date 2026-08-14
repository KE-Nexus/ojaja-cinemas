"use client";

import { useState } from "react";
import { PickItemModal } from "@/components/admin/pick-item-modal";

export type PriceCardTicketOption = { id: string; label: string; kindLabel: string; type: string; defaultPrice: number; branchId: string };

export function PriceCardTicketsField({
  options,
  initialTicketIds,
  selectedBranchId,
}: {
  options: PriceCardTicketOption[];
  initialTicketIds: string[];
  selectedBranchId: string;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialTicketIds);
  const [modalOpen, setModalOpen] = useState(false);

  // Scoped to the cinema currently chosen in the form — a ticket that belongs to a
  // different branch can never be picked, so a price card can't end up mismatched.
  // Selections made under a different cinema are kept in state (not wiped) in case the
  // user flips back to it, they're just not shown or submitted while it's not current.
  const visibleOptions = options.filter((o) => o.branchId === selectedBranchId);
  const branchVisibleIds = new Set(visibleOptions.map((o) => o.id));
  const visibleSelectedIds = selectedIds.filter((id) => branchVisibleIds.has(id));
  const selected = new Set(visibleSelectedIds);
  const byId = new Map(visibleOptions.map((o) => [o.id, o]));

  function toggle(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll(visibleIds: string[]) {
    setSelectedIds((prev) => {
      const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => prev.includes(id));
      if (allVisibleSelected) return prev.filter((id) => !visibleIds.includes(id));
      const existing = new Set(prev);
      return [...prev, ...visibleIds.filter((id) => !existing.has(id))];
    });
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">Included Tickets</h2>
      <p className="mb-3 text-sm text-muted">Click the add ticket button to include a ticket in your price card</p>

      <div className="rounded-xl border border-border">
        <div className="flex items-center justify-between border-b border-border bg-surface-2/70 px-4 py-2.5">
          <p className="text-sm font-semibold">Tickets</p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={!selectedBranchId || visibleOptions.length === 0}
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-light disabled:opacity-50"
          >
            Add Ticket
          </button>
        </div>

        {!selectedBranchId ? (
          <p className="p-4 text-sm text-muted">Select a cinema above to see its tickets.</p>
        ) : visibleOptions.length === 0 ? (
          <p className="p-4 text-sm text-muted">No tickets exist at this cinema yet.</p>
        ) : visibleSelectedIds.length === 0 ? (
          <p className="p-4 text-sm text-muted">None added yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left text-xs uppercase tracking-wide text-muted">
                <th className="p-3 font-medium">Ticket Name</th>
                <th className="p-3 font-medium">Ticket Class</th>
                <th className="p-3 font-medium">Ticket Type</th>
                <th className="p-3 font-medium">Price</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleSelectedIds.map((id, i) => {
                const option = byId.get(id);
                return (
                  <tr key={id} className={i < visibleSelectedIds.length - 1 ? "border-b border-border/50" : ""}>
                    <td className="p-2.5 text-brand-light">{option?.label ?? id}</td>
                    <td className="p-2.5 text-muted">{option?.kindLabel ?? "—"}</td>
                    <td className="p-2.5 text-muted">{option?.type ?? "—"}</td>
                    <td className="p-2.5 text-muted">₦{(option?.defaultPrice ?? 0).toLocaleString()}</td>
                    <td className="p-2.5">
                      <input type="hidden" name="ticketId" value={id} />
                      <button type="button" onClick={() => toggle(id)} className="text-danger hover:underline">
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <PickItemModal
          options={visibleOptions}
          selectedIds={selected}
          columns={1}
          onToggle={toggle}
          onToggleAll={toggleAll}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
