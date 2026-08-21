"use client";

import { forwardRef, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  Ticket,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  LogOut,
  Film,
  PauseCircle,
  PlayCircle,
  Search,
  CupSoda,
  CalendarDays,
  XCircle,
  RefreshCw,
  Users,
  ClipboardList,
  Wifi,
  WifiOff,
  Receipt,
} from "lucide-react";
import { posCheckoutAction } from "@/actions/pos/checkout";
import { openCashDrawerAction, getShowtimesForDateAction } from "@/actions/pos/tools";
import { logoutAction } from "@/actions/auth";
import { formatNaira } from "@/lib/format";
import { printPosReceipt } from "@/lib/pos-receipt";
import { cn } from "@/lib/cn";
import { PosModalShell } from "@/components/pos/pos-modal-shell";
import { OthersMenu } from "@/components/pos/others-menu";
import { FindItemModal } from "@/components/pos/find-item-modal";
import { FindBookingModal } from "@/components/pos/find-booking-modal";
import { UserSalesModal } from "@/components/pos/user-sales-modal";
import { OrdersModal } from "@/components/pos/orders-modal";
import { CloseSessionModal } from "@/components/pos/close-session-modal";
import { SwapTicketModal } from "@/components/pos/swap-ticket-modal";
import { PosDatePicker } from "@/components/pos/pos-date-picker";
import type { SeatCategory, TicketClassKind } from "@prisma/client";

type ShowtimeOption = {
  id: string;
  movieTitle: string;
  posterUrl: string;
  auditoriumName: string;
  format: string;
  startTime: string;
};

type TicketClassOption = {
  id: string;
  label: string;
  price: number;
  kind: TicketClassKind;
  seatClass: SeatCategory | null;
  packageContents: { tickets: { label: string; quantity: number }[]; items: { name: string; quantity: number }[] } | null;
};

type ItemOption = { id: string; name: string; price: number; group: string; imageUrl: string | null };

type TicketCartLine = { ticketClassId: string; label: string; price: number; quantity: number };
type ItemCartLine = { posItemId: string; name: string; price: number; quantity: number };

type HeldOrder = {
  id: string;
  heldAt: Date;
  selectedShowtimeId: string | null;
  showtimeLabel: string;
  ticketLines: Record<string, TicketCartLine>;
  itemLines: Record<string, ItemCartLine>;
};

const CONCESSION_PAGE_SIZE = 15;

function toLocalDateStr(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function PosTerminal({
  staffName,
  branchName,
  showtimes: initialShowtimes,
  ticketClasses,
  items,
  canCloseSessionSelf,
}: {
  staffName: string;
  branchName: string;
  showtimes: ShowtimeOption[];
  ticketClasses: TicketClassOption[];
  items: ItemOption[];
  canCloseSessionSelf: boolean;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"tickets" | "concession">("tickets");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showtimes, setShowtimes] = useState<ShowtimeOption[]>(initialShowtimes);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [concessionPage, setConcessionPage] = useState(0);
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<string | null>(null);
  const [ticketLines, setTicketLines] = useState<Record<string, TicketCartLine>>({});
  const [itemLines, setItemLines] = useState<Record<string, ItemCartLine>>({});
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [activeModal, setActiveModal] = useState<"findItem" | "findBooking" | "userSales" | "orders" | "closeSession" | "swapTicket" | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [offlineSalesBlocked, setOfflineSalesBlocked] = useState(0);
  const [showModeModal, setShowModeModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDatePending, startDateTransition] = useTransition();
  const dateTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // While offline, a cashier can keep tapping items onto the cart (no network needed),
  // but every action that touches the server — checkout, hold recall, swap, reports, log
  // off — is disabled until connectivity returns, so nothing gets attempted against a dead
  // connection and silently fails or desyncs.
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  function changeDate(date: Date) {
    if (Object.keys(ticketLines).length > 0) {
      if (!confirm("Switching days will clear the tickets already in this order. Continue?")) return;
      setTicketLines({});
    }
    setSelectedShowtimeId(null);
    setSelectedDate(date);
    startDateTransition(async () => {
      const result = await getShowtimesForDateAction(toLocalDateStr(date));
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setShowtimes(result.showtimes ?? []);
    });
  }

  const selectedShowtime = showtimes.find((s) => s.id === selectedShowtimeId) ?? null;

  function pickShowtime(id: string) {
    if (id !== selectedShowtimeId && Object.keys(ticketLines).length > 0) {
      if (!confirm("Switching showtimes will clear the tickets already in this order. Continue?")) return;
      setTicketLines({});
    }
    setSelectedShowtimeId(id);
  }

  function addTicket(tc: TicketClassOption) {
    if (!selectedShowtimeId) {
      toast.error("Pick a showtime first.");
      return;
    }
    setTicketLines((prev) => {
      const existing = prev[tc.id];
      return { ...prev, [tc.id]: { ticketClassId: tc.id, label: tc.label, price: tc.price, quantity: (existing?.quantity ?? 0) + 1 } };
    });
  }

  function adjustTicket(id: string, delta: number) {
    setTicketLines((prev) => {
      const line = prev[id];
      if (!line) return prev;
      const quantity = line.quantity + delta;
      if (quantity <= 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: { ...line, quantity } };
    });
  }

  function addItem(it: ItemOption) {
    setItemLines((prev) => {
      const existing = prev[it.id];
      return { ...prev, [it.id]: { posItemId: it.id, name: it.name, price: it.price, quantity: (existing?.quantity ?? 0) + 1 } };
    });
  }

  function adjustItem(id: string, delta: number) {
    setItemLines((prev) => {
      const line = prev[id];
      if (!line) return prev;
      const quantity = line.quantity + delta;
      if (quantity <= 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: { ...line, quantity } };
    });
  }

  function clearCart() {
    setTicketLines({});
    setItemLines({});
    setSelectedShowtimeId(null);
  }

  function abortOrder() {
    if (cartEmpty) return;
    if (!confirm("Abort this order? Everything in the cart will be cleared.")) return;
    clearCart();
    toast("Order aborted.");
  }

  function holdOrder() {
    if (cartEmpty) return;
    const held: HeldOrder = {
      id: crypto.randomUUID(),
      heldAt: new Date(),
      selectedShowtimeId,
      showtimeLabel: selectedShowtime?.movieTitle ?? "Concessions only",
      ticketLines,
      itemLines,
    };
    setHeldOrders((prev) => [held, ...prev]);
    clearCart();
    toast.success("Order held.");
  }

  function recallOrder(id: string) {
    const held = heldOrders.find((h) => h.id === id);
    if (!held) return;
    if (!cartEmpty) {
      const parked: HeldOrder = {
        id: crypto.randomUUID(),
        heldAt: new Date(),
        selectedShowtimeId,
        showtimeLabel: selectedShowtime?.movieTitle ?? "Concessions only",
        ticketLines,
        itemLines,
      };
      setHeldOrders((prev) => [parked, ...prev.filter((h) => h.id !== id)]);
    } else {
      setHeldOrders((prev) => prev.filter((h) => h.id !== id));
    }
    setTicketLines(held.ticketLines);
    setItemLines(held.itemLines);
    setSelectedShowtimeId(held.selectedShowtimeId);
    setShowHeldOrders(false);
  }

  function deleteHeldOrder(id: string) {
    setHeldOrders((prev) => prev.filter((h) => h.id !== id));
  }

  function handleOthersSelect(action: "openCashDrawer" | "closeSession" | "swapTicket") {
    if (action === "openCashDrawer") {
      startTransition(async () => {
        const result = await openCashDrawerAction();
        if (result.error) toast.error(result.error);
        else toast.success("Cash drawer opened.");
      });
      return;
    }
    setActiveModal(action);
  }

  const ticketTotal = Object.values(ticketLines).reduce((s, l) => s + l.price * l.quantity, 0);
  const itemTotal = Object.values(itemLines).reduce((s, l) => s + l.price * l.quantity, 0);
  const total = ticketTotal + itemTotal;
  const cartEmpty = Object.keys(ticketLines).length === 0 && Object.keys(itemLines).length === 0;

  function checkout(method: "CASH" | "CARD") {
    if (cartEmpty) {
      toast.error("Add at least one ticket or item to this order.");
      return;
    }
    if (!isOnline) {
      setOfflineSalesBlocked((n) => n + 1);
      toast.error("You're offline — checkout needs a connection.");
      return;
    }
    startTransition(async () => {
      const result = await posCheckoutAction(
        {
          showtimeId: selectedShowtimeId,
          ticketLines: Object.values(ticketLines).map((l) => ({ ticketClassId: l.ticketClassId, quantity: l.quantity })),
          itemLines: Object.values(itemLines).map((l) => ({ posItemId: l.posItemId, quantity: l.quantity })),
        },
        method
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Sale complete — ${result.reference} · ${formatNaira(result.total ?? 0)}`);
      await printPosReceipt({
        reference: result.reference ?? "",
        branchName,
        staffName,
        paymentMethod: method,
        ticketLines: Object.values(ticketLines).map((l) => ({ label: l.label, quantity: l.quantity, price: l.price })),
        itemLines: Object.values(itemLines).map((l) => ({ label: l.name, quantity: l.quantity, price: l.price })),
        total: result.total ?? total,
      });
      clearCart();
    });
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 bg-gradient-to-r from-brand/20 via-black to-accent-cyan/10 px-4 py-3">
        <TabPill active={activeTab === "concession"} onClick={() => setActiveTab("concession")} icon={<CupSoda size={14} />}>
          Concession
        </TabPill>
        <TabPill
          ref={dateTabRef}
          active={activeTab === "tickets"}
          onClick={() => {
            if (activeTab === "tickets") {
              if (!isOnline) {
                toast.error("Changing the date needs a connection — you're offline.");
                return;
              }
              setShowDatePicker((v) => !v);
            } else {
              setActiveTab("tickets");
            }
          }}
          icon={<Ticket size={14} />}
        >
          Tickets {isSameDay(selectedDate, now) ? "Today" : selectedDate.toLocaleDateString("en-NG", { weekday: "short", month: "short", day: "numeric" })}
          <CalendarDays size={12} className="opacity-70" />
        </TabPill>
        {showDatePicker && (
          <PosDatePicker anchorRef={dateTabRef} value={selectedDate} onSelect={changeDate} onClose={() => setShowDatePicker(false)} />
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            onClick={() => setActiveModal("findItem")}
            className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-sm font-medium text-muted transition-all hover:border-white/30 hover:text-white"
          >
            <Search size={14} /> Find Item
          </button>
          <button
            disabled={!isOnline}
            onClick={() => setShowHeldOrders(true)}
            className="relative flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-sm font-medium text-muted transition-all hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <PauseCircle size={14} /> Held
            {heldOrders.length > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                {heldOrders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main grid */}
        <main className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            {activeTab === "tickets" ? (
              <motion.div key="tickets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Showtimes ·{" "}
                  {selectedDate.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
                {isDatePending ? (
                  <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-muted">Loading showtimes...</p>
                ) : showtimes.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-muted">No sessions scheduled this day.</p>
                ) : (
                  <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
                    {showtimes.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => pickShowtime(st.id)}
                        className={cn(
                          "glow-card flex w-44 shrink-0 flex-col overflow-hidden rounded-xl border text-left transition-all",
                          selectedShowtimeId === st.id ? "border-brand-light shadow-[0_0_0_2px_rgba(194,44,201,0.4)]" : "border-white/10 hover:border-brand/40"
                        )}
                      >
                        <div className="relative h-24 w-full bg-white/5">
                          <Image src={st.posterUrl} alt={st.movieTitle} fill unoptimized className="object-cover" />
                        </div>
                        <div className="p-2.5">
                          <p className="line-clamp-1 text-sm font-semibold">{st.movieTitle}</p>
                          <p className="text-xs text-muted">
                            {new Date(st.startTime).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })} · {st.auditoriumName} · {st.format}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedShowtime && (
                  <>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                      <Film size={12} /> Ticket Types for {selectedShowtime.movieTitle}
                    </p>
                    {ticketClasses.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-muted">No ticket types configured.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {ticketClasses.map((tc) => (
                          <GridTile key={tc.id} label={tc.label} price={tc.price} onClick={() => addTicket(tc)} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div key="concession" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Concession</p>
                {items.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-muted">No items available at this cinema.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                      {items.slice(concessionPage * CONCESSION_PAGE_SIZE, (concessionPage + 1) * CONCESSION_PAGE_SIZE).map((it) => (
                        <GridTile key={it.id} label={it.name} price={it.price} imageUrl={it.imageUrl} onClick={() => addItem(it)} />
                      ))}
                    </div>
                    {items.length > CONCESSION_PAGE_SIZE && (
                      <div className="mt-4 flex flex-wrap items-center gap-1.5">
                        {Array.from({ length: Math.ceil(items.length / CONCESSION_PAGE_SIZE) }, (_, i) => (
                          <button
                            key={i}
                            onClick={() => setConcessionPage(i)}
                            className={cn(
                              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                              concessionPage === i ? "border-brand-light bg-brand text-white" : "border-white/10 text-muted hover:border-white/30 hover:text-white"
                            )}
                          >
                            Page {i + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => setConcessionPage((p) => Math.min(p + 1, Math.ceil(items.length / CONCESSION_PAGE_SIZE) - 1))}
                          disabled={concessionPage >= Math.ceil(items.length / CONCESSION_PAGE_SIZE) - 1}
                          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-white/30 hover:text-white disabled:opacity-30"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Cart sidebar */}
        <aside className="flex w-80 shrink-0 flex-col border-l border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold">Current Order</p>
            {!cartEmpty && (
              <button
                disabled={!isOnline}
                onClick={clearCart}
                className="flex items-center gap-1 text-xs text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Trash2 size={12} /> Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {cartEmpty ? (
              <p className="mt-10 text-center text-sm text-muted">No items yet</p>
            ) : (
              <div className="space-y-3">
                {Object.values(ticketLines).length > 0 && selectedShowtime && (
                  <div>
                    <p className="mb-1.5 line-clamp-1 text-xs font-semibold text-brand-light">{selectedShowtime.movieTitle}</p>
                    {Object.values(ticketLines).map((l) => {
                      const tc = ticketClasses.find((t) => t.id === l.ticketClassId);
                      return (
                        <CartRow
                          key={l.ticketClassId}
                          label={l.label}
                          price={l.price}
                          quantity={l.quantity}
                          onInc={() => adjustTicket(l.ticketClassId, 1)}
                          onDec={() => adjustTicket(l.ticketClassId, -1)}
                          badge={tc?.kind === "PACKAGE" ? "Bundle" : undefined}
                          subContent={
                            tc?.packageContents
                              ? [
                                  ...tc.packageContents.tickets.map((t) => `${t.quantity * l.quantity}× ${t.label}`),
                                  ...tc.packageContents.items.map((it) => `${it.quantity * l.quantity}× ${it.name}`),
                                ].join(" · ")
                              : undefined
                          }
                        />
                      );
                    })}
                  </div>
                )}
                {Object.values(itemLines).length > 0 && (
                  <div>
                    {Object.values(ticketLines).length > 0 && <div className="my-2 border-t border-white/10" />}
                    {Object.values(itemLines).map((l) => (
                      <CartRow
                        key={l.posItemId}
                        label={l.name}
                        price={l.price}
                        quantity={l.quantity}
                        onInc={() => adjustItem(l.posItemId, 1)}
                        onDec={() => adjustItem(l.posItemId, -1)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 px-4 py-3">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-muted">Order Total</span>
              <span className="text-lg font-bold text-white">{formatNaira(total)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                disabled={cartEmpty || !isOnline}
                onClick={holdOrder}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-semibold text-white transition-transform active:scale-95 disabled:opacity-30"
              >
                <PauseCircle size={16} /> Hold
              </button>
              <button
                disabled={cartEmpty || isPending || !isOnline}
                onClick={() => checkout("CASH")}
                className="flex flex-col items-center justify-center gap-1 rounded-xl bg-success py-3 text-xs font-semibold text-black transition-transform active:scale-95 disabled:opacity-30"
              >
                <Banknote size={16} /> Cash
              </button>
              <button
                disabled={cartEmpty || isPending || !isOnline}
                onClick={() => checkout("CARD")}
                className="flex flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-brand to-accent-cyan py-3 text-xs font-semibold text-white transition-transform active:scale-95 disabled:opacity-30"
              >
                <CreditCard size={16} /> Card
              </button>
              {!isOnline && (
                <p className="col-span-3 text-center text-[11px] text-danger">
                  Offline — keep adding items. Checkout will be available once you&rsquo;re back online.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom action bar */}
      <div className="flex flex-wrap items-stretch divide-x divide-white/10 border-t border-white/10 bg-white/[0.03] text-xs font-medium text-muted">
        <form action={logoutAction} className="contents">
          <ActionBarButton type="submit" icon={<LogOut size={13} />} label="Log Off" disabled={!isOnline} />
        </form>
        <ActionBarButton icon={<XCircle size={13} />} label="Abort" onClick={abortOrder} danger disabled={!isOnline} />
        <ActionBarButton icon={<RefreshCw size={13} />} label="Refresh" onClick={() => router.refresh()} disabled={!isOnline} />
        <ActionBarButton icon={<Receipt size={13} />} label="Today's Sales" onClick={() => setActiveModal("orders")} disabled={!isOnline} />
        <ActionBarButton icon={<Users size={13} />} label="Get Sales By User" onClick={() => setActiveModal("userSales")} disabled={!isOnline} />
        <ActionBarButton icon={<ClipboardList size={13} />} label="Find Booking" onClick={() => setActiveModal("findBooking")} disabled={!isOnline} />
        <ActionBarButton
          icon={isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
          label={isOnline ? "Mode: Online" : "Mode: Offline"}
          onClick={() => setShowModeModal(true)}
        />
        <OthersMenu onSelect={handleOthersSelect} disabled={!isOnline} />
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between border-t border-white/10 bg-black px-4 py-2 text-xs text-muted">
        <span>{now.toLocaleString("en-NG", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</span>
        <span>{now.toLocaleTimeString("en-NG")}</span>
        <span>
          {staffName} · {branchName}
        </span>
        {isOnline ? (
          <span className="flex items-center gap-1 text-success">
            <Wifi size={12} /> Online
          </span>
        ) : (
          <span className="flex items-center gap-1 text-danger">
            <WifiOff size={12} /> Offline
          </span>
        )}
      </div>

      {showHeldOrders && (
        <PosModalShell title="Held Orders" onClose={() => setShowHeldOrders(false)}>
          {heldOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No orders on hold.</p>
          ) : (
            <div className="space-y-2">
              {heldOrders.map((h) => {
                const ticketCount = Object.values(h.ticketLines).reduce((s, l) => s + l.quantity, 0);
                const itemCount = Object.values(h.itemLines).reduce((s, l) => s + l.quantity, 0);
                const heldTotal =
                  Object.values(h.ticketLines).reduce((s, l) => s + l.price * l.quantity, 0) +
                  Object.values(h.itemLines).reduce((s, l) => s + l.price * l.quantity, 0);
                return (
                  <div key={h.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-semibold">{h.showtimeLabel}</p>
                      <p className="text-xs text-muted">
                        {ticketCount > 0 ? `${ticketCount} ticket${ticketCount === 1 ? "" : "s"}` : ""}
                        {ticketCount > 0 && itemCount > 0 ? " · " : ""}
                        {itemCount > 0 ? `${itemCount} item${itemCount === 1 ? "" : "s"}` : ""}
                        {" · "}
                        {formatNaira(heldTotal)} · {h.heldAt.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => recallOrder(h.id)}
                        className="flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-light"
                      >
                        <PlayCircle size={13} /> Recall
                      </button>
                      <button onClick={() => deleteHeldOrder(h.id)} className="rounded-lg p-1.5 text-danger hover:bg-white/10" aria-label="Discard">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PosModalShell>
      )}

      {activeModal === "findItem" && (
        <FindItemModal items={items} onAdd={(it) => addItem(it)} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "findBooking" && <FindBookingModal onClose={() => setActiveModal(null)} />}
      {activeModal === "userSales" && <UserSalesModal onClose={() => setActiveModal(null)} />}
      {activeModal === "orders" && <OrdersModal onClose={() => setActiveModal(null)} />}
      {activeModal === "closeSession" && (
        <CloseSessionModal canCloseSelf={canCloseSessionSelf} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "swapTicket" && (
        <SwapTicketModal
          replacementLines={Object.values(ticketLines).map((l) => ({ ticketClassId: l.ticketClassId, label: l.label, quantity: l.quantity }))}
          onSwapComplete={() => setTicketLines({})}
          onClose={() => setActiveModal(null)}
        />
      )}

      {showModeModal && (
        <PosModalShell title="Cashier Mode" onClose={() => setShowModeModal(false)} widthClass="max-w-sm">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              {isOnline ? <Wifi size={15} className="text-success" /> : <WifiOff size={15} className="text-danger" />}
              Mode: {isOnline ? "Online" : "Offline"}
            </p>
            <button
              onClick={() => setIsOnline((v) => !v)}
              className="rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-light"
            >
              Toggle Mode
            </button>
          </div>

          <p className="mt-4 text-center text-sm text-muted">
            Offline sales blocked this session: <span className="font-semibold text-white">{offlineSalesBlocked}</span>
          </p>
          <p className="mt-1 text-center text-xs text-muted">
            While offline you can still browse and add tickets or concessions to the cart — payment can only be taken once you&rsquo;re back online.
          </p>

          <button
            onClick={() => setShowModeModal(false)}
            className="mt-4 w-full rounded-lg border border-white/10 py-2.5 text-sm font-semibold text-white hover:bg-white/5"
          >
            Close
          </button>
        </PosModalShell>
      )}
    </div>
  );
}

const TabPill = forwardRef<HTMLButtonElement, { active: boolean; onClick: () => void; icon?: React.ReactNode; children: React.ReactNode }>(
  function TabPill({ active, onClick, icon, children }, ref) {
    return (
      <button
        ref={ref}
        onClick={onClick}
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
          active ? "border-brand-light bg-brand text-white shadow-[0_0_16px_-2px_rgba(194,44,201,0.7)]" : "border-white/10 text-muted hover:border-white/30 hover:text-white"
        )}
      >
        {icon}
        {children}
      </button>
    );
  }
);

function ActionBarButton({
  icon,
  label,
  onClick,
  type = "button",
  danger,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  type?: "button" | "submit";
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 whitespace-nowrap px-3 py-2.5 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent",
        danger && "text-danger hover:text-danger"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function GridTile({
  label,
  price,
  imageUrl,
  onClick,
}: {
  label: string;
  price: number;
  imageUrl?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="glow-card flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] text-left transition-all hover:-translate-y-0.5 hover:border-brand-light/60 hover:bg-white/[0.06] active:scale-[0.97]"
    >
      {imageUrl ? (
        <div className="relative h-20 w-full bg-white/5">
          <Image src={imageUrl} alt={label} fill unoptimized className="object-cover" />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col items-start justify-between p-3.5">
        <span className="line-clamp-2 text-sm font-semibold">{label}</span>
        <span className="mt-2 text-sm font-bold text-brand-light">{formatNaira(price)}</span>
      </div>
    </button>
  );
}

function CartRow({
  label,
  price,
  quantity,
  onInc,
  onDec,
  badge,
  subContent,
}: {
  label: string;
  price: number;
  quantity: number;
  onInc: () => void;
  onDec: () => void;
  badge?: string;
  subContent?: string;
}) {
  return (
    <div className="mb-2 rounded-lg bg-white/[0.03] p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 line-clamp-1 text-sm">
            {label}
            {badge && <span className="shrink-0 rounded-full bg-brand/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-brand-light">{badge}</span>}
          </p>
          <p className="text-xs text-muted">{formatNaira(price)} each</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button onClick={onDec} className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
            <Minus size={11} />
          </button>
          <span className="w-4 text-center text-sm">{quantity}</span>
          <button onClick={onInc} className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
            <Plus size={11} />
          </button>
        </div>
      </div>
      {subContent && <p className="mt-1.5 line-clamp-2 text-[11px] text-muted/80">Includes: {subContent}</p>}
    </div>
  );
}
