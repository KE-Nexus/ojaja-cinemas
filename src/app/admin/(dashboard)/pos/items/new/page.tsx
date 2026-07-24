import { prisma } from "@/lib/prisma";
import { PosItemForm } from "@/components/admin/pos-item-form";

export default async function NewLocationItemPage() {
  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Add Item</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <PosItemForm branches={branches} requireBranch />
      </div>
    </div>
  );
}
