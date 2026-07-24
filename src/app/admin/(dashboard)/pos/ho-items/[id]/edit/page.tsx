import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PosItemForm } from "@/components/admin/pos-item-form";

export default async function EditHoItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.posItem.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Edit HO Item</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <PosItemForm item={item} requireBranch={false} />
      </div>
    </div>
  );
}
