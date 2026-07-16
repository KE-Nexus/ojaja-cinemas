import { prisma } from "@/lib/prisma";
import { SpaceRequestStatusSelect } from "@/components/admin/space-request-status";

export default async function AdminSpaceRequestsPage() {
  const requests = await prisma.spaceBookingRequest.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="font-sans text-2xl font-bold tracking-tight">Space Requests</h1>
      <p className="mb-6 text-sm text-muted">Private hall &amp; event booking enquiries.</p>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="p-3 font-medium">Contact</th>
              <th className="p-3 font-medium">Event</th>
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Guests</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b border-border/50 align-top">
                <td className="p-3">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted">
                    {r.email} · {r.phone}
                  </p>
                </td>
                <td className="p-3">
                  <p>{r.eventType}</p>
                  {r.message && <p className="max-w-xs text-xs text-muted">{r.message}</p>}
                </td>
                <td className="p-3 text-muted">{new Date(r.eventDate).toLocaleDateString("en-NG")}</td>
                <td className="p-3">{r.headcount}</td>
                <td className="p-3">
                  <SpaceRequestStatusSelect id={r.id} status={r.status} />
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted">
                  No space requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
