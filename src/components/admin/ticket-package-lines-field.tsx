"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { PickItemModal, type PickableOption } from "@/components/admin/pick-item-modal";

export type TicketLineOption = PickableOption;
export type SelectedLine = { id: string; quantity: number };

function BundleLinesField({
  title,
  addLabel,
  emptyLabel,
  idFieldName,
  quantityFieldName,
  options,
  initialLines,
  modalColumns,
  onChange,
}: {
  title: string;
  addLabel: string;
  emptyLabel: string;
  idFieldName: string;
  quantityFieldName: string;
  options: TicketLineOption[];
  initialLines: SelectedLine[];
  modalColumns: 1 | 3;
  onChange?: (lines: SelectedLine[]) => void;
}) {
  const [selected, setSelected] = useState<SelectedLine[]>(initialLines);
  const [modalOpen, setModalOpen] = useState(false);

  const selectedIds = new Set(selected.map((s) => s.id));
  const priceById = new Map(options.map((o) => [o.id, o.defaultPrice]));

  function updateSelected(updater: (prev: SelectedLine[]) => SelectedLine[]) {
    setSelected((prev) => {
      const next = updater(prev);
      onChange?.(next);
      return next;
    });
  }

  function toggle(id: string) {
    updateSelected((prev) => (prev.some((s) => s.id === id) ? prev.filter((s) => s.id !== id) : [...prev, { id, quantity: 1 }]));
  }

  function toggleAll(visibleIds: string[]) {
    updateSelected((prev) => {
      const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => prev.some((s) => s.id === id));
      if (allVisibleSelected) return prev.filter((s) => !visibleIds.includes(s.id));
      const existingIds = new Set(prev.map((s) => s.id));
      const toAdd = visibleIds.filter((id) => !existingIds.has(id)).map((id) => ({ id, quantity: 1 }));
      return [...prev, ...toAdd];
    });
  }

  return (
    <div className="rounded-xl border border-border">
      <div className="flex items-center justify-between border-b border-border bg-surface-2/70 px-4 py-2.5">
        <p className="text-sm font-semibold">{title}</p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={options.length === 0}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-light disabled:opacity-50"
        >
          {addLabel}
        </button>
      </div>

      {options.length === 0 ? (
        <p className="p-4 text-sm text-muted">{emptyLabel}</p>
      ) : selected.length === 0 ? (
        <p className="p-4 text-sm text-muted">None added yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-left text-xs uppercase tracking-wide text-muted">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Price</th>
              <th className="p-3 font-medium">Quantity</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {selected.map((row, i) => (
              <tr key={row.id} className={i < selected.length - 1 ? "border-b border-border/50" : ""}>
                <td className="p-2.5">{options.find((o) => o.id === row.id)?.label ?? row.id}</td>
                <td className="p-2.5 text-muted">₦{(priceById.get(row.id) ?? 0).toLocaleString()}</td>
                <td className="p-2.5">
                  <input type="hidden" name={idFieldName} value={row.id} />
                  <Input
                    name={quantityFieldName}
                    type="number"
                    min={1}
                    step={1}
                    value={row.quantity}
                    onChange={(e) => {
                      const quantity = Math.max(1, Number(e.currentTarget.value) || 1);
                      updateSelected((prev) => prev.map((s) => (s.id === row.id ? { ...s, quantity } : s)));
                    }}
                    className="w-20"
                    required
                  />
                </td>
                <td className="p-2.5">
                  <button type="button" onClick={() => toggle(row.id)} className="text-danger hover:underline">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <PickItemModal
          options={options}
          selectedIds={selectedIds}
          columns={modalColumns}
          onToggle={toggle}
          onToggleAll={toggleAll}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

export function TicketBundleLinesField({
  options,
  initialLines,
  onChange,
}: {
  options: TicketLineOption[];
  initialLines: SelectedLine[];
  onChange?: (lines: SelectedLine[]) => void;
}) {
  return (
    <BundleLinesField
      title="Tickets"
      addLabel="Add Ticket"
      emptyLabel="No Standard tickets exist at this cinema yet to bundle in."
      idFieldName="ticketLineId"
      quantityFieldName="ticketLineQuantity"
      options={options}
      initialLines={initialLines}
      modalColumns={1}
      onChange={onChange}
    />
  );
}

export function ItemBundleLinesField({
  options,
  initialLines,
  onChange,
}: {
  options: TicketLineOption[];
  initialLines: SelectedLine[];
  onChange?: (lines: SelectedLine[]) => void;
}) {
  return (
    <BundleLinesField
      title="Items"
      addLabel="Add Item"
      emptyLabel="No POS items exist at this cinema yet to bundle in."
      idFieldName="itemLineId"
      quantityFieldName="itemLineQuantity"
      options={options}
      initialLines={initialLines}
      modalColumns={3}
      onChange={onChange}
    />
  );
}
