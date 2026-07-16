import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { REPORT_DEFINITIONS } from "@/lib/admin-reports";
import { ReportList } from "@/components/admin/report-list";

export default async function AdminReportsPage() {
  const session = await getSession();
  if (session?.role !== "MANAGER" && session?.role !== "ADMIN") redirect("/admin");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">All Reports</h1>
      <p className="mb-6 text-sm text-muted">Generate a report to view it on screen or export it as CSV.</p>
      <ReportList reports={REPORT_DEFINITIONS} />
    </div>
  );
}
