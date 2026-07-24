import { PosItemForm } from "@/components/admin/pos-item-form";

export default function NewHoItemPage() {
  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Add HO Item</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <PosItemForm requireBranch={false} />
      </div>
    </div>
  );
}
