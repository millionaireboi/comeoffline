"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { instrumentSerif, API_URL } from "@/lib/constants";
import type { Event } from "@comeoffline/types";

interface TicketData {
  id: string;
  user_name?: string;
  user_handle?: string;
  tier_name: string;
  pickup_point: string;
  status: string;
  checked_in_at?: string;
}

export function CheckInTab() {
  const { getIdToken } = useAuth();
  const [eventId, setEventId] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; ticket?: TicketData } | null>(null);
  const [manualSearch, setManualSearch] = useState("");
  const [ticketIdInput, setTicketIdInput] = useState("");
  const scannerRef = useRef<HTMLInputElement>(null);

  // Load events
  useEffect(() => {
    async function fetchEvents() {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch(`${API_URL}/api/admin/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.data) setEvents(data.data.filter((e: Event) => e.status === "live" || e.status === "upcoming"));
      } catch (err) {
        console.error("Failed to fetch events for check-in:", err);
      }
    }
    fetchEvents();
  }, [getIdToken]);

  // Load tickets for selected event
  useEffect(() => {
    if (!eventId) return;
    async function fetchTickets() {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch(`${API_URL}/api/tickets/admin/events/${eventId}/tickets`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.data) setTickets(data.data);
      } catch (err) {
        console.error("Failed to fetch tickets:", err);
      }
    }
    fetchTickets();
  }, [eventId, scanResult, getIdToken]);

  const handleCheckIn = useCallback(async (ticketId: string) => {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/tickets/check-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ticket_id: ticketId }),
      });
      const data = await res.json();

      if (data.success) {
        setScanResult({
          success: true,
          message: `${data.data.user_name} checked in!`,
          ticket: data.data,
        });
      } else {
        setScanResult({
          success: false,
          message: data.error || "Check-in failed",
          ticket: data.data,
        });
      }

      setTimeout(() => setScanResult(null), 5000);
    } catch {
      setScanResult({ success: false, message: "Network error" });
      setTimeout(() => setScanResult(null), 5000);
    }
  }, [getIdToken]);

  const handleScanSubmit = () => {
    if (!ticketIdInput.trim()) return;
    // Try to parse QR data (JSON with ticket_id) or use raw input
    let ticketId = ticketIdInput.trim();
    try {
      const parsed = JSON.parse(ticketId);
      if (parsed.ticket_id) ticketId = parsed.ticket_id;
    } catch {
      // Raw ticket ID — use as-is
    }
    handleCheckIn(ticketId);
    setTicketIdInput("");
    scannerRef.current?.focus();
  };

  const filteredTickets = manualSearch
    ? tickets.filter(
        (t) =>
          t.user_name?.toLowerCase().includes(manualSearch.toLowerCase()) ||
          t.user_handle?.toLowerCase().includes(manualSearch.toLowerCase()),
      )
    : tickets;

  const checkedIn = tickets.filter((t) => t.status === "checked_in").length;

  return (
    <div className="w-full space-y-6 sm:max-w-3xl">
      {/* Event selector */}
      <div>
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
          select event
        </label>
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none"
        >
          <option value="">Choose event...</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.emoji} {e.title} ({e.status})
            </option>
          ))}
        </select>
      </div>

      {eventId && (
        <>
          {/* Stats bar */}
          <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-3">
            <div>
              <p className={`${instrumentSerif.className} text-2xl text-cream`}>{checkedIn}</p>
              <p className="font-mono text-[9px] text-muted">checked in</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className={`${instrumentSerif.className} text-2xl text-cream`}>{tickets.length}</p>
              <p className="font-mono text-[9px] text-muted">total tickets</p>
            </div>
            <div className="ml-auto h-2 w-32 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-sage"
                style={{ width: tickets.length > 0 ? `${(checkedIn / tickets.length) * 100}%` : "0%" }}
              />
            </div>
          </div>

          {/* Scan result banner */}
          {scanResult && (
            <div
              className={`rounded-xl p-4 font-mono text-sm ${
                scanResult.success
                  ? "bg-sage/20 text-sage"
                  : "bg-terracotta/20 text-terracotta"
              }`}
            >
              {scanResult.success ? "\u2705" : "\u274C"} {scanResult.message}
              {scanResult.ticket && (
                <span className="ml-2 text-[10px] opacity-70">
                  {scanResult.ticket.tier_name} &middot; {scanResult.ticket.pickup_point}
                </span>
              )}
            </div>
          )}

          {/* QR Scanner input */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
            <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[2px] text-cream">
              scan QR code
            </h3>
            <p className="mb-3 font-mono text-[10px] text-muted">
              scan the QR or paste the ticket ID below
            </p>
            <div className="flex gap-2">
              <input
                ref={scannerRef}
                type="text"
                value={ticketIdInput}
                onChange={(e) => setTicketIdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScanSubmit()}
                placeholder="Scan or paste ticket ID..."
                autoFocus
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
              />
              <button
                onClick={handleScanSubmit}
                className="rounded-lg bg-caramel px-5 py-3 font-mono text-[11px] font-medium text-near-black transition-opacity hover:opacity-80"
              >
                check in
              </button>
            </div>
          </div>

          {/* Manual search + attendee list */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-[11px] uppercase tracking-[2px] text-cream">
                attendee list
              </h3>
              <input
                type="text"
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                placeholder="Search by name..."
                className="w-56 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[11px] text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4"
                >
                  <div>
                    <p className="font-sans text-sm font-medium text-cream">
                      {ticket.user_name || "Unknown"}
                    </p>
                    <p className="font-mono text-[10px] text-muted">
                      {ticket.tier_name} &middot; {ticket.pickup_point}
                    </p>
                  </div>
                  {ticket.status === "checked_in" ? (
                    <span className="rounded-full bg-sage/15 px-3 py-1 font-mono text-[10px] text-sage">
                      checked in
                    </span>
                  ) : ticket.status === "confirmed" ? (
                    <button
                      onClick={() => handleCheckIn(ticket.id)}
                      className="rounded-lg bg-caramel/20 px-3 py-1.5 font-mono text-[10px] text-caramel hover:bg-caramel/30"
                    >
                      check in
                    </button>
                  ) : (
                    <span className="rounded-full bg-white/5 px-3 py-1 font-mono text-[10px] text-muted">
                      {ticket.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
