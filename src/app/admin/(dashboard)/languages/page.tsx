import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { LanguageForm } from "@/components/admin/language-form";
import { LanguageActions } from "@/components/admin/language-actions";

export default async function LanguagesPage() {
  const session = await getSession();
  if (session?.role !== "CIRCUIT_ADMIN") redirect("/admin");

  const languages = await prisma.language.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="font-sans text-2xl font-bold tracking-tight">Languages</h1>
      <p className="mb-6 text-sm text-muted">
        The single list every "select a language" dropdown across the app draws from.
      </p>

      <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
        <LanguageForm />
      </div>

      {languages.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">No languages yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {languages.map((l) => (
                <tr key={l.id} className="border-b border-border/50">
                  <td className="p-3 font-medium">{l.name}</td>
                  <td className="p-3">
                    <Badge tone={l.isActive ? "success" : "neutral"}>{l.isActive ? "Active" : "Disabled"}</Badge>
                  </td>
                  <td className="p-3">
                    <LanguageActions id={l.id} isActive={l.isActive} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
