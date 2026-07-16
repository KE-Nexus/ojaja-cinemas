import { BranchForm } from "@/components/admin/branch-form";

export default function NewLocationPage() {
  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Add Cinema</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <BranchForm />
      </div>
    </div>
  );
}
