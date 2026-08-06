import Link from "next/link";
import { redirect } from "next/navigation";
import { Warehouse, Package, AlertTriangle, Boxes } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasClaim } from "@/lib/claims";
import { formatNaira } from "@/lib/format";
import { LocationFilterField } from "@/components/admin/location-filter-field";
import { getBranchScope, resolveScopedBranchId } from "@/lib/branch-scope";

const LOW_STOCK_THRESHOLD = 10;

function StatTile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "danger" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div
        className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${tone === "danger" ? "bg-danger/15 text-danger" : "bg-brand/15 text-brand-light"}`}
      >
        {icon}
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

export default async function StockOverviewPage({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "SUPERVISOR" && session.role !== "CIRCUIT_ADMIN")) redirect("/admin");
  if (!(await hasClaim(session.role, "CAN_UPDATE_ITEMS"))) redirect("/admin");

  const { location } = await searchParams;
  const scope = await getBranchScope();
  const effectiveLocation = resolveScopedBranchId(scope, location);

  const branches = scope.isCircuitAdmin
    ? await prisma.branch.findMany({ orderBy: { name: "asc" } })
    : await prisma.branch.findMany({ where: { id: scope.branchId ?? undefined } });
  const accessibleBranchIds = branches.map((b) => b.id);

  const [hoItems, locationItemsAll, locationItemsFiltered] = await Promise.all([
    prisma.posItem.findMany({ where: { branchId: null }, orderBy: { name: "asc" } }),
    // Unfiltered-by-location (but still branch-scoped to what this viewer can see) — used to
    // roll up each HO catalog item's stock across every location that's stocking it.
    prisma.posItem.findMany({ where: { branchId: { in: accessibleBranchIds } } }),
    prisma.posItem.findMany({
      where: { branchId: effectiveLocation ? effectiveLocation : { in: accessibleBranchIds } },
      include: { branch: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalsByName = new Map<string, { stock: number; locations: Set<string> }>();
  for (const item of locationItemsAll) {
    const key = item.name.trim().toLowerCase();
    const entry = totalsByName.get(key) ?? { stock: 0, locations: new Set<string>() };
    entry.stock += item.stockOnHand;
    if (item.branchId) entry.locations.add(item.branchId);
    totalsByName.set(key, entry);
  }

  const totalStockUnits = locationItemsFiltered.reduce((sum, i) => sum + i.stockOnHand, 0);
  const lowStockItems = locationItemsFiltered.filter((i) => i.stockOnHand <= LOW_STOCK_THRESHOLD);
  const totalStockValue = locationItemsFiltered.reduce((sum, i) => sum + i.stockOnHand * i.defaultPrice, 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Overview</h1>
          <p className="text-sm text-muted">Live stock levels across the master catalog and per-location inventory.</p>
        </div>
        <form method="get" className="flex flex-wrap items-center gap-2">
          <LocationFilterField branches={branches} selected={effectiveLocation} locked={!scope.isCircuitAdmin} />
          <button type="submit" className="rounded-lg border border-border px-3 py-2 text-sm hover:border-brand/50">
            Filter
          </button>
        </form>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={<Warehouse size={18} />} label="HO Catalog Items" value={String(hoItems.length)} />
        <StatTile icon={<Package size={18} />} label="Location Items" value={String(locationItemsFiltered.length)} />
        <StatTile icon={<Boxes size={18} />} label="Total Stock Units" value={totalStockUnits.toLocaleString()} />
        <StatTile icon={<AlertTriangle size={18} />} label="Low Stock Items" value={String(lowStockItems.length)} tone={lowStockItems.length > 0 ? "danger" : undefined} />
      </div>

      <section className="mb-8">
        <h2 className="mb-1 text-lg font-semibold">HO Items</h2>
        <p className="mb-4 text-sm text-muted">All items in all locations — the shared master catalog, with stock rolled up across every location selling each one.</p>

        {hoItems.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">No HO items yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Item Class</th>
                  <th className="p-3 font-medium">Item Group</th>
                  <th className="p-3 font-medium">Default Price</th>
                  <th className="p-3 font-medium">Locations Stocking</th>
                  <th className="p-3 font-medium">Total Stock</th>
                </tr>
              </thead>
              <tbody>
                {hoItems.map((it) => {
                  const totals = totalsByName.get(it.name.trim().toLowerCase());
                  return (
                    <tr key={it.id} className="border-b border-border/50">
                      <td className="p-3 font-medium">{it.name}</td>
                      <td className="p-3 text-muted">{it.itemClass}</td>
                      <td className="p-3 text-muted">{it.itemGroup}</td>
                      <td className="p-3 text-muted">{formatNaira(it.defaultPrice)}</td>
                      <td className="p-3 text-muted">{totals?.locations.size ?? 0}</td>
                      <td className="p-3 text-muted">{totals?.stock ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Items</h2>
        <p className="mb-4 text-sm text-muted">Items available in a specific location, with current stock on hand.</p>

        {locationItemsFiltered.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
            {effectiveLocation ? "No items for this cinema." : "No location items yet."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Location</th>
                  <th className="p-3 font-medium">Item Class</th>
                  <th className="p-3 font-medium">Item Group</th>
                  <th className="p-3 font-medium">Default Price</th>
                  <th className="p-3 font-medium">Stock On Hand</th>
                  <th className="p-3 font-medium">Stock Value</th>
                </tr>
              </thead>
              <tbody>
                {locationItemsFiltered.map((it) => {
                  const low = it.stockOnHand <= LOW_STOCK_THRESHOLD;
                  return (
                    <tr key={it.id} className="border-b border-border/50">
                      <td className="p-3 font-medium">{it.name}</td>
                      <td className="p-3 text-muted">{it.branch?.name ?? "—"}</td>
                      <td className="p-3 text-muted">{it.itemClass}</td>
                      <td className="p-3 text-muted">{it.itemGroup}</td>
                      <td className="p-3 text-muted">{formatNaira(it.defaultPrice)}</td>
                      <td className="p-3">
                        <span className={low ? "font-medium text-danger" : "text-foreground"}>{it.stockOnHand}</span>
                        {low && <span className="ml-1.5 text-xs text-danger">Low</span>}
                      </td>
                      <td className="p-3 text-muted">{formatNaira(it.stockOnHand * it.defaultPrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="border-t border-border p-3 text-right text-sm text-muted">
              Total stock value: <span className="font-medium text-foreground">{formatNaira(totalStockValue)}</span>
            </div>
          </div>
        )}
      </section>

      <p className="mt-6 text-xs text-muted">
        Need to move stock?{" "}
        <Link href="/admin/pos/stock-requests" className="text-brand-light hover:underline">
          Stock Requests
        </Link>
        {", "}
        <Link href="/admin/pos/stock-receipts" className="text-brand-light hover:underline">
          Stock Receipts
        </Link>
        {", or "}
        <Link href="/admin/pos/stock-transfers" className="text-brand-light hover:underline">
          Stock Transfers
        </Link>
        .
      </p>
    </div>
  );
}
