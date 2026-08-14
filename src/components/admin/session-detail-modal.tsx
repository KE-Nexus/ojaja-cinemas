"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { X, Trash2, Pencil } from "lucide-react";
import { deleteSessionAction } from "@/actions/admin/scheduling";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/format";
import { useSchedulingActions } from "@/components/admin/scheduling-provider";
import { EditSessionModal } from "@/components/admin/edit-session-modal";
import type { ScheduleSession } from "@/components/admin/scheduling-day-view";

export function SessionDetailModal({ session, onClose }: { session: ScheduleSession; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const { movies, rooms, priceCards } = useSchedulingActions();
  const start = new Date(session.startTime);
  const end = new Date(start.getTime() + session.runtimeMins * 60000);
  const [canEdit] = useState(() => start.getTime() > Date.now());

  if (editing) {
    return (
      <EditSessionModal
        session={session}
        movies={movies}
        rooms={rooms}
        priceCards={priceCards}
        onClose={() => setEditing(false)}
        onSaved={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <h3 className="pr-4 font-semibold">{session.movieTitle}</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Time</dt>
            <dd>
              {formatTime(start)} – {formatTime(end)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Date</dt>
            <dd>{formatDate(start)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Format / Language</dt>
            <dd>
              {session.format} · {session.language}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Occupancy</dt>
            <dd>
              {session.bookedSeats}/{session.capacity} seats
            </dd>
          </div>
        </dl>

        {!canEdit && (
          <p className="mt-4 text-xs text-muted">This session has already started, so it can no longer be edited.</p>
        )}

        <div className="mt-5 flex gap-2">
          {canEdit && (
            <Button size="sm" className="flex-1" onClick={() => setEditing(true)}>
              <Pencil size={14} /> Edit Session
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            className="flex-1"
            disabled={isPending}
            onClick={() => {
              if (!confirm(`Delete this session for "${session.movieTitle}"?`)) return;
              startTransition(async () => {
                try {
                  await deleteSessionAction(session.id);
                  toast.success("Session deleted.");
                  onClose();
                } catch {
                  toast.error("Failed to delete session — it may already have bookings.");
                }
              });
            }}
          >
            <Trash2 size={14} /> {isPending ? "Deleting..." : "Delete Session"}
          </Button>
        </div>
      </div>
    </div>
  );
}
