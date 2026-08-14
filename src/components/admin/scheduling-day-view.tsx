"use client";

import { useMemo, useState } from "react";
import { colorForMovie } from "@/lib/schedule-colors";
import { formatTime } from "@/lib/format";
import { SessionDetailModal } from "@/components/admin/session-detail-modal";
import { useSchedulingActions } from "@/components/admin/scheduling-provider";
import { toDatetimeLocal } from "@/components/admin/create-film-sessions-modal";

export type ScheduleSession = {
  id: string;
  movieId: string;
  movieTitle: string;
  auditoriumId: string;
  priceCardId: string | null;
  language: string;
  format: string;
  startTime: string; // ISO
  endTime: string | null; // ISO
  runtimeMins: number;
  trailerDurationMins: number;
  cleanupTimeMins: number;
  status: string;
  salesOnPos: boolean;
  salesOnWeb: boolean;
  bookedSeats: number;
  capacity: number;
};

export type ScheduleRoom = {
  id: string;
  name: string;
  sessions: ScheduleSession[];
};

const HOUR_WIDTH = 56;
const START_HOUR = 0;
const END_HOUR = 24;

export function SchedulingDayView({ rooms, dayStartISO }: { rooms: ScheduleRoom[]; dayStartISO: string }) {
  const [selected, setSelected] = useState<ScheduleSession | null>(null);
  const { openCreateModal } = useSchedulingActions();
  const hours = useMemo(() => Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i), []);
  const totalWidth = hours.length * HOUR_WIDTH;

  const uniqueMovies = useMemo(() => {
    const map = new Map<string, string>();
    rooms.forEach((r) => r.sessions.forEach((s) => map.set(s.movieId, s.movieTitle)));
    return Array.from(map.entries());
  }, [rooms]);

  // Only fires for a direct click on the empty timeline background — session blocks and
  // hour gridlines are children, so a click that bubbles from one of those has a different
  // e.target, and this guard skips it (they already have their own click handling).
  function handleTimelineClick(e: React.MouseEvent<HTMLDivElement>, roomId: string) {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const decimalHour = START_HOUR + (e.clientX - rect.left) / HOUR_WIDTH;
    const snappedMinutes = Math.round((decimalHour * 60) / 15) * 15;
    const day = new Date(dayStartISO);
    const clicked = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, snappedMinutes);
    openCreateModal({ auditoriumId: roomId, startTime: toDatetimeLocal(clicked) });
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <div style={{ width: totalWidth + 96 }}>
          {/* Hour ruler */}
          <div className="sticky top-0 z-10 flex border-b border-border bg-surface-2">
            <div className="w-24 shrink-0 border-r border-border" />
            {hours.map((h) => (
              <div key={h} style={{ width: HOUR_WIDTH }} className="shrink-0 border-r border-border/60 py-1.5 text-center text-[11px] text-muted">
                {h === 12 ? <span className="block text-[9px] text-muted/70">PM</span> : h === 0 ? <span className="block text-[9px] text-muted/70">AM</span> : null}
                {h % 12 === 0 ? 12 : h % 12}
              </div>
            ))}
          </div>

          {/* Room rows */}
          {rooms.map((room) => (
            <div key={room.id} className="flex border-b border-border">
              <div className="flex w-24 shrink-0 items-center border-r border-border bg-surface-2 px-2 py-3 text-sm font-medium">
                {room.name}
              </div>
              <div
                className="relative cursor-pointer"
                style={{ width: totalWidth, height: 100 }}
                onClick={(e) => handleTimelineClick(e, room.id)}
                title="Click to schedule a session at this time"
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute top-0 h-full border-r border-border/40"
                    style={{ left: (h - START_HOUR) * HOUR_WIDTH }}
                  />
                ))}
                {room.sessions.map((s) => {
                  const start = new Date(s.startTime);
                  const startDecimal = start.getHours() + start.getMinutes() / 60;
                  const durationHours = s.runtimeMins / 60;
                  const left = (startDecimal - START_HOUR) * HOUR_WIDTH;
                  const width = Math.max(durationHours * HOUR_WIDTH, 44);
                  const { bg, text } = colorForMovie(s.movieId);
                  const end = new Date(start.getTime() + s.runtimeMins * 60000);

                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className="absolute top-1.5 flex flex-col justify-between overflow-hidden rounded-md p-1.5 text-left shadow-sm transition-transform hover:z-20 hover:scale-[1.03]"
                      style={{ left, width, height: 88, backgroundColor: bg, color: text }}
                      title={`${s.movieTitle} · ${formatTime(start)}–${formatTime(end)}`}
                    >
                      <span className="text-[9px] font-medium uppercase opacity-80">{s.language}</span>
                      <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{s.movieTitle}</span>
                      <span className="text-[9px] opacity-80">
                        {formatTime(start)}–{formatTime(end)}
                      </span>
                      <span className="flex items-center gap-1 text-[9px] font-medium opacity-90">
                        {s.bookedSeats}/{s.capacity}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {rooms.length === 0 && <p className="p-8 text-center text-sm text-muted">No auditoriums configured for this branch.</p>}
        </div>
      </div>

      {uniqueMovies.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs">
          {uniqueMovies.map(([id, title]) => {
            const { bg } = colorForMovie(id);
            return (
              <div key={id} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: bg }} />
                {title}
              </div>
            );
          })}
        </div>
      )}

      {selected && <SessionDetailModal session={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
