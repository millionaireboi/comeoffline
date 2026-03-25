"use client";

import { useState, useEffect, useCallback } from "react";
import type { Ticket, Event } from "@comeoffline/types";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { apiFetch } from "@/lib/api";
import { Noise } from "@/components/shared/Noise";
import { PullToRefresh } from "@/components/shared/PullToRefresh";

type EnrichedTicket = Ticket & { event_title: string; event_emoji: string; event_date: string };

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  confirmed: { color: "#6B7A63", bg: "#6B7A6315", label: "confirmed" },
  pending_payment: { color: "#D4A574", bg: "#D4A57415", label: "pending" },
  checked_in: { color: "#5B8CB8", bg: "#5B8CB815", label: "checked in" },
  partially_checked_in: { color: "#D4A574", bg: "#D4A57415", label: "partially checked in" },
  cancelled: { color: "#9B8E82", bg: "#9B8E8215", label: "cancelled" },
  no_show: { color: "#9B8E82", bg: "#9B8E8215", label: "no show" },
};

export function BookingsScreen() {
  const { getIdToken, loading: authLoading } = useAuth();
  const { setStage, setActiveTicket, setCurrentEvent, setNavigationOrigin, activeTicket } = useAppStore();
  const [tickets, setTickets] = useState<EnrichedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setFetchError(false);
    try {
      const token = await getIdToken();
      if (!token) { setFetchError(true); setLoading(false); return; }
      const res = await apiFetch<{ success: boolean; data: EnrichedTicket[] }>("/api/tickets/mine", { token });
      if (res.data) setTickets(res.data);
    } catch (err) {
      console.error("Failed to load bookings:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  // Wait for auth to finish loading before fetching bookings
  useEffect(() => {
    if (!authLoading) fetchTickets();
  }, [authLoading, fetchTickets]);

  const handleViewBooking = async (ticket: EnrichedTicket) => {
    setViewingId(ticket.id);
    try {
      const token = await getIdToken();
      if (!token) return;
      const eventRes = await apiFetch<{ success: boolean; data: Event }>(
        `/api/events/${ticket.event_id}`,
        { token },
      );
      if (!eventRes.data) {
        alert("Couldn\u2019t load event details. Please try again.");
        return;
      }
      // Set both event and ticket, then explicitly navigate to countdown.
      // useStage's determineEventStage will refine to the correct sub-stage
      // (countdown/reveal/dayof/memories) on the next recalculation cycle.
      setNavigationOrigin("bookings");
      setCurrentEvent(eventRes.data);
      setActiveTicket(ticket);
      setStage("countdown");
    } catch (err) {
      console.error("Failed to load event:", err);
      alert("Couldn\u2019t load event details. Check your connection.");
    } finally {
      setViewingId(null);
    }
  };

  const handleCancelTicket = async (ticketId: string) => {
    if (!confirm("Cancel this ticket? This can\u2019t be undone.")) return;
    setCancellingId(ticketId);
    try {
      const token = await getIdToken();
      if (!token) return;
      await apiFetch(`/api/tickets/${ticketId}`, { method: "DELETE", token });
      setTickets((prev) =>
        prev.map((t) => t.id === ticketId ? { ...t, status: "cancelled" as const } : t),
      );
      if (activeTicket?.id === ticketId) {
        setActiveTicket(null);
        setCurrentEvent(null);
      }
    } catch (err) {
      console.error("Failed to cancel ticket:", err);
      alert("Failed to cancel ticket. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  // Separate active bookings from past/cancelled
  const now = new Date();
  const activeStatuses = new Set(["confirmed", "checked_in", "partially_checked_in", "pending_payment"]);
  const activeBookings = tickets.filter((t) => {
    if (!activeStatuses.has(t.status)) return false;
    if (t.event_date) {
      const eventDate = new Date(t.event_date);
      const dayAfter = new Date(eventDate);
      dayAfter.setDate(dayAfter.getDate() + 2);
      return now < dayAfter;
    }
    return true;
  });
  const pastBookings = tickets.filter((t) => !activeBookings.includes(t));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="animate-fadeIn text-center">
          <p className="font-mono text-[11px] uppercase tracking-[3px] text-muted">loading bookings...</p>
        </div>
      </div>
    );
  }

  if (fetchError && tickets.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-8 text-center">
        <span className="mb-4 text-4xl">{"\u{1F614}"}</span>
        <p className="mb-2 font-serif text-xl text-near-black">couldn&apos;t load bookings</p>
        <p className="mb-6 font-sans text-sm text-muted">check your connection and try again.</p>
        <button
          onClick={() => { setLoading(true); fetchTickets(); }}
          className="rounded-full bg-near-black px-6 py-2.5 font-mono text-[11px] text-white"
        >
          retry
        </button>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={fetchTickets} className="min-h-screen bg-cream pb-[120px]">
      <Noise />

      {/* Header */}
      <section className="animate-fadeSlideUp px-5 pb-6 pt-8">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[3px] text-muted">
          your tickets
        </p>
        <h2
          className="font-serif text-[32px] font-normal leading-tight text-near-black"
          style={{ letterSpacing: "-0.5px" }}
        >
          bookings
        </h2>
      </section>

      {/* Empty state */}
      {tickets.length === 0 && (
        <section className="animate-fadeSlideUp px-5 pt-8" style={{ animationDelay: "0.1s" }}>
          <div className="rounded-[20px] border-[1.5px] border-dashed border-sand p-10 text-center">
            <span className="mb-3 block text-[32px]">&#x1F3AB;</span>
            <p className="font-serif text-lg text-warm-brown">no bookings yet</p>
            <p className="mt-1 font-mono text-[11px] text-muted">
              grab a ticket from the events feed
            </p>
            <button
              onClick={() => setStage("feed")}
              className="mt-5 rounded-full bg-near-black px-6 py-3 font-mono text-[11px] text-white transition-all active:scale-95"
            >
              browse events
            </button>
          </div>
        </section>
      )}

      {/* Active bookings */}
      {activeBookings.length > 0 && (
        <section className="animate-fadeSlideUp px-4" style={{ animationDelay: "0.08s" }}>
          <span className="mb-3 block px-1 font-mono text-[10px] uppercase tracking-[2px] text-muted">
            active
          </span>
          <div className="flex flex-col gap-3">
            {activeBookings.map((ticket, i) => {
              const style = STATUS_STYLES[ticket.status] || STATUS_STYLES.cancelled;
              const isExpanded = expandedTicketId === ticket.id;
              const isCancellable = ["confirmed", "pending_payment"].includes(ticket.status);
              const isCancelling = cancellingId === ticket.id;
              const isViewing = viewingId === ticket.id;

              return (
                <div
                  key={ticket.id}
                  className="animate-fadeSlideUp overflow-hidden rounded-[18px] bg-white shadow-[0_2px_12px_rgba(26,23,21,0.06)]"
                  style={{ animationDelay: `${0.1 + i * 0.06}s` }}
                >
                  {/* Summary — tappable */}
                  <button
                    onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex-shrink-0 text-2xl">{ticket.event_emoji}</span>
                      <div className="min-w-0">
                        <p className="truncate font-sans text-[15px] font-medium text-near-black">
                          {ticket.event_title}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-muted">
                          {ticket.tier_name}{ticket.event_date ? ` \u00B7 ${ticket.event_date}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                      <span
                        className="whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[9px] uppercase"
                        style={{ color: style.color, background: style.bg }}
                      >
                        {style.label}
                      </span>
                      <span className="font-mono text-[10px] text-muted">
                        {isExpanded ? "\u2212" : "+"}
                      </span>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-sand px-4 pb-4 pt-3">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-mono text-[10px] text-muted">price</span>
                        <span className="font-sans text-[14px] font-semibold text-near-black">
                          {ticket.price === 0 ? "Free" : `\u20B9${ticket.price}`}
                        </span>
                      </div>

                      {ticket.quantity > 1 && (
                        <div className="mb-3 flex items-center justify-between">
                          <span className="font-mono text-[10px] text-muted">guests</span>
                          <span className="font-sans text-[13px] text-near-black">{ticket.quantity}</span>
                        </div>
                      )}

                      {(ticket.spot_name || ticket.seat_id || ticket.section_name) && (
                        <div className="mb-3 flex items-center justify-between">
                          <span className="font-mono text-[10px] text-muted">seat</span>
                          <span className="font-sans text-[13px] text-near-black">
                            {ticket.spot_name && (
                              <>
                                {ticket.spot_name}
                                {ticket.spot_seat_label && `, ${ticket.spot_seat_label}`}
                              </>
                            )}
                            {ticket.seat_id && !ticket.spot_name && ticket.seat_id}
                            {ticket.section_name && !ticket.seat_id && !ticket.spot_name && ticket.section_name}
                          </span>
                        </div>
                      )}

                      {ticket.pickup_point && ticket.pickup_point !== "TBD" && (
                        <div className="mb-3 flex items-center justify-between">
                          <span className="font-mono text-[10px] text-muted">pickup</span>
                          <span className="font-sans text-[13px] text-near-black">{ticket.pickup_point}</span>
                        </div>
                      )}

                      {ticket.add_ons && ticket.add_ons.length > 0 && (
                        <div className="mb-3">
                          <span className="mb-1 block font-mono text-[10px] text-muted">add-ons</span>
                          {ticket.add_ons.map((a, i) => (
                            <p key={i} className="font-sans text-[13px] text-near-black">
                              {a.name} x{a.quantity} — \u20B9{a.price * a.quantity}
                            </p>
                          ))}
                        </div>
                      )}

                      {ticket.qr_code && ["confirmed", "checked_in", "partially_checked_in"].includes(ticket.status) && (
                        <div className="mb-3 flex justify-center">
                          <img
                            src={ticket.qr_code}
                            alt="Ticket QR"
                            className="h-[140px] w-[140px] rounded-xl"
                          />
                        </div>
                      )}

                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-mono text-[10px] text-muted">purchased</span>
                        <span className="font-mono text-[10px] text-muted">
                          {new Date(ticket.purchased_at).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Action buttons — min 44px tap targets */}
                      <div className="flex flex-col gap-2">
                        {["confirmed", "checked_in", "partially_checked_in"].includes(ticket.status) && (
                          <button
                            onClick={() => handleViewBooking(ticket)}
                            disabled={isViewing}
                            className="w-full rounded-xl bg-near-black py-3 font-mono text-[11px] text-white transition-all active:scale-[0.98] disabled:opacity-60"
                          >
                            {isViewing ? "loading..." : "view event details"}
                          </button>
                        )}
                        {isCancellable && (
                          <button
                            onClick={() => handleCancelTicket(ticket.id)}
                            disabled={isCancelling}
                            className="w-full rounded-xl border border-terracotta/20 bg-terracotta/5 py-3 font-mono text-[11px] text-terracotta transition-colors active:bg-terracotta/10 disabled:opacity-50"
                          >
                            {isCancelling ? "cancelling..." : "cancel ticket"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Past bookings */}
      {pastBookings.length > 0 && (
        <section className="animate-fadeSlideUp px-4 pt-6" style={{ animationDelay: "0.15s" }}>
          <span className="mb-3 block px-1 font-mono text-[10px] uppercase tracking-[2px] text-muted">
            past
          </span>
          <div className="flex flex-col gap-2">
            {pastBookings.map((ticket) => {
              const style = STATUS_STYLES[ticket.status] || STATUS_STYLES.cancelled;
              return (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
                  style={{ opacity: ticket.status === "cancelled" ? 0.55 : 1 }}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex-shrink-0 text-xl">{ticket.event_emoji}</span>
                    <div className="min-w-0">
                      <p className="truncate font-sans text-[14px] font-medium text-near-black">
                        {ticket.event_title}
                      </p>
                      <p className="font-mono text-[10px] text-muted">
                        {ticket.tier_name}{ticket.event_date ? ` \u00B7 ${ticket.event_date}` : ""}
                      </p>
                    </div>
                  </div>
                  <span
                    className="ml-2 flex-shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[9px] uppercase"
                    style={{ color: style.color, background: style.bg }}
                  >
                    {style.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </PullToRefresh>
  );
}
