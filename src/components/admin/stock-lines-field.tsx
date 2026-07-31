"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Select, Input, Label } from "@/components/ui/input";

export type StockLineItem = { id: string; name: string; itemClass: string; itemGroup: string };

export function StockLinesField({ items, withCost = false }: { items: StockLineItem[]; withCost?: boolean }) {
  const [rows, setRows] = useState<number[]>([0]);
  const [nextKey, setNextKey] = useState(1);

  return (
    <div>
      <Label>Line items</Label>
      <div className="space-y-2">
        {rows.map((key) => (
          <div key={key} className="grid grid-cols-[1fr_100px_auto] gap-2 sm:grid-cols-[1fr_100px_120px_auto]">
            <Select name="posItemId" required defaultValue="">
              <option value="" disabled>
                Select item
              </option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.itemClass}/{item.itemGroup})
                </option>
              ))}
            </Select>
            <Input name="quantity" type="number" min={1} step={1} placeholder="Qty" required />
            {withCost && <Input name="unitCost" type="number" min={0} step="any" placeholder="Unit cost" required />}
            <button
              type="button"
              onClick={() => setRows((r) => (r.length > 1 ? r.filter((k) => k !== key) : r))}
              className="text-muted hover:text-danger"
              aria-label="Remove line"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setRows((r) => [...r, nextKey]);
          setNextKey((k) => k + 1);
        }}
        className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-light hover:underline"
      >
        <Plus size={13} /> Add line
      </button>
      {items.length === 0 && <p className="mt-2 text-xs text-danger">No items available at this cinema yet.</p>}
    </div>
  );
}
