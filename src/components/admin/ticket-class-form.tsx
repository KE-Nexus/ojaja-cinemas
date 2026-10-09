"use client";

import { useActionState, useState } from "react";
import { createTicketClassAction, updateTicketClassAction, type FormState } from "@/actions/admin/ticket-classes";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import { TicketBundleLinesField, ItemBundleLinesField, type TicketLineOption, type SelectedLine } from "@/components/admin/ticket-package-lines-field";
import { SALES_SOURCES } from "@/lib/ticket-sources";
import type { TicketClass, TicketClassKind } from "@prisma/client";

type TicketWithLines = TicketClass & {
  packageTicketLines: { ticketClassId: string; quantity: number }[];
  packageItemLines: { posItemId: string; quantity: number }[];
};

export function TicketClassForm({
  ticket,
  branches,
  standardTicketOptions,
  itemOptions,
}: {
  ticket?: TicketWithLines;
  branches: { id: string; name: string }[];
  standardTicketOptions: TicketLineOption[];
  itemOptions: (TicketLineOption & { branchId: string | null })[];
}) {
  const action = ticket ? updateTicketClassAction : createTicketClassAction;
  const [state, formAction, isPending] = useActionState<FormState, FormData>(action, null);
  // Every field below is controlled by React state rather than `defaultValue` — React's
  // <form action> integration resets uncontrolled fields after the action runs even when it
  // returns a validation error (only a thrown error skips the reset), which was wiping out
  // everything the admin had already typed the moment validation failed.
  const [description, setDescription] = useState(ticket?.description ?? "");
  const [type, setType] = useState(ticket?.type ?? "");
  const [branchId, setBranchId] = useState(ticket?.branchId ?? "");
  const [seatClass, setSeatClass] = useState(ticket?.seatClass ?? "");
  const [kind, setKind] = useState<TicketClassKind>(ticket?.kind ?? "STANDARD");
  const [manualPrice, setManualPrice] = useState(String(ticket?.defaultPrice ?? ""));
  const [salesTaxPercent, setSalesTaxPercent] = useState(String(ticket?.salesTaxPercent ?? 0));
  const [isActive, setIsActive] = useState(ticket ? ticket.isActive : true);
  const [isLoyaltyTicket, setIsLoyaltyTicket] = useState(Boolean(ticket?.isLoyaltyTicket));
  const [isComplementary, setIsComplementary] = useState(Boolean(ticket?.isComplementary));
  const [salesSources, setSalesSources] = useState<string[]>(ticket?.salesSources ?? []);
  const [packageTicketLines, setPackageTicketLines] = useState<SelectedLine[]>(
    ticket?.packageTicketLines.map((l) => ({ id: l.ticketClassId, quantity: l.quantity })) ?? []
  );
  const [packageItemLines, setPackageItemLines] = useState<SelectedLine[]>(
    ticket?.packageItemLines.map((l) => ({ id: l.posItemId, quantity: l.quantity })) ?? []
  );

  const ticketPriceById = new Map(standardTicketOptions.map((o) => [o.id, o.defaultPrice]));
  const itemPriceById = new Map(itemOptions.map((o) => [o.id, o.defaultPrice]));
  // Scoped to the cinema picked above — a null branchId is a Head Office item shared across
  // every location, so it stays visible no matter which cinema is selected.
  const visibleItemOptions = itemOptions.filter((it) => it.branchId === null || it.branchId === branchId);
  const packageTotal =
    packageTicketLines.reduce((sum, l) => sum + (ticketPriceById.get(l.id) ?? 0) * l.quantity, 0) +
    packageItemLines.reduce((sum, l) => sum + (itemPriceById.get(l.id) ?? 0) * l.quantity, 0);
  const isPackage = kind === "PACKAGE";
  const priceValue = isPackage ? String(packageTotal) : manualPrice;

  return (
    <form action={formAction} className="space-y-6">
      {ticket && <input type="hidden" name="id" value={ticket.id} />}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="description">Ticket Type Name</Label>
          <Input
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            placeholder="Adult"
            required
          />
        </div>
        <div>
          <Label htmlFor="type">Short Name</Label>
          <Input id="type" name="type" value={type} onChange={(e) => setType(e.currentTarget.value)} placeholder="ADULT" required />
        </div>
        <div>
          <Label htmlFor="branchId">Cinema</Label>
          <Select id="branchId" name="branchId" value={branchId} onChange={(e) => setBranchId(e.currentTarget.value)} required>
            <option value="">Select a cinema</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="seatClass">Seat Class</Label>
          <Select id="seatClass" name="seatClass" value={seatClass} onChange={(e) => setSeatClass(e.currentTarget.value)}>
            <option value="">None</option>
            <option value="STANDARD">Standard</option>
            <option value="PREMIUM">Premium</option>
            <option value="RECLINER">Recliner</option>
            <option value="ACCESSIBLE">Accessible</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="kind">Ticket Class</Label>
          <Select
            id="kind"
            // A disabled field is dropped from FormData entirely on submit — which was
            // wiping "kind" out of the request on every edit and failing the required
            // enum validation server-side. Only the create form submits this field
            // directly; edits submit the locked value via the hidden input below instead.
            name={ticket ? undefined : "kind"}
            value={kind}
            disabled={Boolean(ticket)}
            onChange={(e) => setKind(e.currentTarget.value as TicketClassKind)}
          >
            <option value="STANDARD">Standard</option>
            <option value="PACKAGE">Package</option>
            <option value="VOUCHER">Voucher</option>
          </Select>
          {ticket && (
            <>
              <input type="hidden" name="kind" value={kind} />
              <p className="mt-1 text-xs text-muted">A ticket&rsquo;s class can&rsquo;t be changed after it&rsquo;s created.</p>
            </>
          )}
        </div>
        <div>
          <Label htmlFor="defaultPrice">Price</Label>
          <Input
            id="defaultPrice"
            name="defaultPrice"
            type="number"
            min={0}
            step="0.01"
            value={priceValue}
            onChange={(e) => setManualPrice(e.currentTarget.value)}
            readOnly={isPackage}
            className={isPackage ? "cursor-not-allowed opacity-70" : undefined}
            required
          />
          {isPackage && <p className="mt-1 text-xs text-muted">Auto-calculated from the included tickets and items below.</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="salesTaxPercent">Sales Tax (%)</Label>
          <Input
            id="salesTaxPercent"
            name="salesTaxPercent"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={salesTaxPercent}
            onChange={(e) => setSalesTaxPercent(e.currentTarget.value)}
          />
        </div>
        <div>
          <Label>Status</Label>
          <div className="flex items-center gap-4 rounded-lg border border-border bg-surface-2/80 px-3.5 py-2.5 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="isActive"
                value="true"
                checked={isActive}
                onChange={() => setIsActive(true)}
                className="accent-brand"
              />
              Active
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="isActive"
                value="false"
                checked={!isActive}
                onChange={() => setIsActive(false)}
                className="accent-brand"
              />
              Inactive
            </label>
          </div>
        </div>
        <div>
          <Label>Loyalty Ticket</Label>
          <div className="flex items-center gap-4 rounded-lg border border-border bg-surface-2/80 px-3.5 py-2.5 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="isLoyaltyTicket"
                value="true"
                checked={isLoyaltyTicket}
                onChange={() => setIsLoyaltyTicket(true)}
                className="accent-brand"
              />
              Yes
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="isLoyaltyTicket"
                value="false"
                checked={!isLoyaltyTicket}
                onChange={() => setIsLoyaltyTicket(false)}
                className="accent-brand"
              />
              No
            </label>
          </div>
        </div>
      </div>

      {(kind === "STANDARD" || kind === "VOUCHER") && (
        <div className="max-w-xs">
          <Label>{kind === "VOUCHER" ? "Is Voucher Complementary" : "Is Complementary"}</Label>
          <label className="flex items-center gap-2 rounded-lg border border-border bg-surface-2/80 px-3.5 py-2.5 text-sm">
            <input
              type="checkbox"
              name="isComplementary"
              checked={isComplementary}
              onChange={(e) => setIsComplementary(e.currentTarget.checked)}
              className="h-4 w-4 accent-brand"
            />
            Free / no charge {kind === "VOUCHER" ? "voucher" : "ticket"}
          </label>
        </div>
      )}

      <div>
        <Label>Sales Source</Label>
        <div className="flex flex-wrap gap-2">
          {SALES_SOURCES.map((source) => (
            <label
              key={source}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2/80 px-3 py-2 text-sm has-[:checked]:border-brand/60 has-[:checked]:bg-brand/10"
            >
              <input
                type="checkbox"
                name="salesSources"
                value={source}
                checked={salesSources.includes(source)}
                onChange={(e) =>
                  setSalesSources((prev) => (e.currentTarget.checked ? [...prev, source] : prev.filter((s) => s !== source)))
                }
                className="h-4 w-4 accent-brand"
              />
              {source}
            </label>
          ))}
        </div>
      </div>

      {kind === "PACKAGE" && (
        <div className="space-y-4">
          <TicketBundleLinesField
            options={standardTicketOptions}
            initialLines={packageTicketLines}
            onChange={setPackageTicketLines}
          />
          <ItemBundleLinesField
            options={visibleItemOptions}
            initialLines={packageItemLines}
            onChange={setPackageItemLines}
          />
        </div>
      )}

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : ticket ? "Save Changes" : "Create Ticket"}
      </Button>
    </form>
  );
}
