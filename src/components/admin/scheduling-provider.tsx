"use client";

import { createContext, useContext, useState } from "react";
import { CreateFilmSessionsModal, type SessionPrefill } from "@/components/admin/create-film-sessions-modal";

type Movie = { id: string; title: string; runtimeMins: number };
type Room = { id: string; name: string };
type PriceCardOption = { id: string; name: string };
type Branch = { id: string; name: string };
type LanguageOption = { id: string; name: string };

type SchedulingCtx = {
  openCreateModal: (prefill?: SessionPrefill) => void;
  movies: Movie[];
  rooms: Room[];
  priceCards: PriceCardOption[];
  languages: LanguageOption[];
};
const SchedulingContext = createContext<SchedulingCtx | null>(null);

export function useSchedulingActions() {
  const ctx = useContext(SchedulingContext);
  if (!ctx) throw new Error("useSchedulingActions must be used within SchedulingProvider");
  return ctx;
}

export function SchedulingProvider({
  children,
  movies,
  rooms,
  priceCards,
  branches,
  languages,
  defaultBranchId,
  defaultDate,
}: {
  children: React.ReactNode;
  movies: Movie[];
  rooms: Room[];
  priceCards: PriceCardOption[];
  branches: Branch[];
  languages: LanguageOption[];
  defaultBranchId?: string;
  defaultDate: string;
}) {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<SessionPrefill>(null);

  return (
    <SchedulingContext.Provider
      value={{
        openCreateModal: (p) => {
          setPrefill(p ?? null);
          setOpen(true);
        },
        movies,
        rooms,
        priceCards,
        languages,
      }}
    >
      {children}
      <CreateFilmSessionsModal
        open={open}
        onOpenChange={setOpen}
        movies={movies}
        rooms={rooms}
        priceCards={priceCards}
        branches={branches}
        languages={languages}
        defaultBranchId={defaultBranchId}
        defaultDate={defaultDate}
        prefill={prefill}
      />
    </SchedulingContext.Provider>
  );
}
