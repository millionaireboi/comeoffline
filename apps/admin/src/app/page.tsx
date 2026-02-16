"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Force dynamic rendering to prevent build-time Firebase initialization issues
export const dynamic = 'force-dynamic';
import { Instrument_Serif } from "next/font/google";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { apiClient } from "@/lib/apiClient";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
});

type Tab = "dashboard" | "events" | "check-in" | "validation" | "content" | "applications" | "members" | "invite-codes" | "settings";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function Home() {
  const { user, loading, isAdmin, login, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gate-black">
        <p className="font-mono text-sm text-muted">loading...</p>
      </div>
    );
  }

  // Not signed in - show login
  if (!user) {
    return <LoginScreen onLogin={login} />;
  }

  // Signed in but not admin
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gate-black px-8 text-center">
        <span className="mb-6 text-5xl">🔒</span>
        <h1 className={`${instrumentSerif.className} text-3xl tracking-tight text-cream`}>
          admin access required
        </h1>
        <p className="mt-4 max-w-[280px] font-mono text-sm text-muted">
          this account doesn&apos;t have admin privileges
        </p>
        <button
          onClick={logout}
          className="mt-8 rounded-xl bg-white/5 px-6 py-3 font-mono text-[11px] uppercase tracking-[2px] text-cream transition-colors hover:bg-white/10"
        >
          sign out
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gate-black text-cream">
      {/* Header */}
      <header className="border-b border-white/5 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between">
          <h1 className={`${instrumentSerif.className} text-xl tracking-tight sm:text-2xl`}>
            come offline &middot; ops
          </h1>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white/5 px-2.5 py-0.5 font-mono text-[9px] text-muted sm:px-3 sm:py-1 sm:text-[10px]">
              admin
            </span>
            <button
              onClick={logout}
              className="rounded-xl bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[2px] text-muted transition-colors hover:bg-white/10 hover:text-cream sm:px-4 sm:py-2"
            >
              sign out
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="overflow-x-auto border-b border-white/5 px-4 sm:px-6">
        <div className="flex gap-1 min-w-max">
          {(["dashboard", "events", "check-in", "validation", "content", "applications", "members", "invite-codes", "settings"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`whitespace-nowrap px-4 py-3 font-mono text-[11px] uppercase tracking-[2px] transition-colors ${
                tab === t
                  ? "border-b-2 border-caramel text-cream"
                  : "text-muted hover:text-cream"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="p-4 sm:p-6">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "events" && <EventsTab />}
        {tab === "check-in" && <CheckInTab />}
        {tab === "validation" && <ValidationTab />}
        {tab === "content" && <ContentTab />}
        {tab === "applications" && <ApplicationsTab />}
        {tab === "members" && <MembersTab />}
        {tab === "invite-codes" && <InviteCodesTab />}
        {tab === "settings" && <SettingsTab />}
      </main>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────

function DashboardTab() {
  const { getIdToken } = useAuth();
  const [stats, setStats] = useState<Record<string, number | string> | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch(`${API_URL}/api/admin/dashboard-stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.data) setStats(data.data);
      } catch {
        // API may not exist yet — show placeholders
      }
    }
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only fetch once on mount

  const items = [
    { label: "total members", value: stats?.total_members ?? "\u2014", emoji: "\uD83D\uDC65" },
    { label: "active events", value: stats?.active_events ?? "\u2014", emoji: "\uD83C\uDFAA" },
    { label: "total tickets", value: stats?.total_tickets ?? "\u2014", emoji: "\uD83C\uDF9F\uFE0F" },
    { label: "vouch codes used", value: stats?.vouch_codes_used ?? "\u2014", emoji: "\u2709\uFE0F" },
    { label: "provisional users", value: stats?.provisional_users ?? "\u2014", emoji: "\uD83C\uDF31" },
    { label: "total revenue", value: stats?.total_revenue != null ? `\u20B9${stats.total_revenue}` : "\u2014", emoji: "\uD83D\uDCB0" },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {items.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <span className="mb-2 block text-xl">{stat.emoji}</span>
          <p className={`${instrumentSerif.className} text-3xl text-cream`}>{stat.value}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[1.5px] text-muted">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Events Management ──────────────────────────────

interface AdminEvent {
  id: string;
  title: string;
  emoji: string;
  date: string;
  status: string;
  total_spots: number;
  spots_taken: number;
  tag: string;
}

function EventsTab() {
  const { getIdToken } = useAuth();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch(`${API_URL}/api/admin/events`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.data) setEvents(data.data);
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [getIdToken]);

  async function updateStatus(eventId: string, newStatus: string) {
    try {
      const token = await getIdToken();
      if (!token) return;
      await fetch(`${API_URL}/api/admin/events/${eventId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, status: newStatus } : e)),
      );
    } catch (err) {
      console.error("Status update failed:", err);
    }
  }

  if (loading) {
    return <p className="py-8 text-center font-mono text-sm text-muted">loading events...</p>;
  }

  const STATUS_COLORS: Record<string, string> = {
    draft: "#7A8B9C",
    upcoming: "#D4A574",
    live: "#6B7A63",
    sold_out: "#D4836B",
    completed: "#9B8E82",
  };

  return (
    <div className="w-full space-y-4 sm:max-w-4xl">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] text-muted">{events.length} events</p>
      </div>

      {events.map((event) => (
        <div
          key={event.id}
          className="rounded-xl border border-white/5 bg-white/[0.02] p-5"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{event.emoji}</span>
              <div>
                <p className="font-sans text-base font-medium text-cream">{event.title}</p>
                <p className="font-mono text-[10px] text-muted">
                  {event.date} &middot; {event.tag}
                </p>
              </div>
            </div>
            <span
              className="rounded-full px-2.5 py-1 font-mono text-[9px] uppercase"
              style={{
                color: STATUS_COLORS[event.status] || "#9B8E82",
                background: (STATUS_COLORS[event.status] || "#9B8E82") + "15",
              }}
            >
              {event.status}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="font-mono text-[10px] text-muted">
              {event.spots_taken}/{event.total_spots} spots filled
            </p>
            <div className="flex gap-2">
              {event.status === "draft" && (
                <button
                  onClick={() => updateStatus(event.id, "upcoming")}
                  className="rounded-lg bg-caramel/20 px-3 py-1.5 font-mono text-[10px] text-caramel hover:bg-caramel/30"
                >
                  publish
                </button>
              )}
              {event.status === "upcoming" && (
                <button
                  onClick={() => updateStatus(event.id, "live")}
                  className="rounded-lg bg-sage/20 px-3 py-1.5 font-mono text-[10px] text-sage hover:bg-sage/30"
                >
                  go live
                </button>
              )}
              {event.status === "live" && (
                <button
                  onClick={() => updateStatus(event.id, "completed")}
                  className="rounded-lg bg-white/10 px-3 py-1.5 font-mono text-[10px] text-muted hover:bg-white/20"
                >
                  complete
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── QR Check-in ────────────────────────────────────

interface TicketData {
  id: string;
  user_name?: string;
  user_handle?: string;
  tier_name: string;
  pickup_point: string;
  status: string;
  checked_in_at?: string;
}

function CheckInTab() {
  const { getIdToken } = useAuth();
  const [eventId, setEventId] = useState("");
  const [events, setEvents] = useState<AdminEvent[]>([]);
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
        if (data.data) setEvents(data.data.filter((e: AdminEvent) => e.status === "live" || e.status === "upcoming"));
      } catch {}
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
      } catch {}
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

          {/* QR Scanner input (for USB/camera QR scanners that type the value) */}
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

// ── Validation Queue ───────────────────────────────

interface ValidationQueueItem {
  user_id: string;
  name: string;
  handle: string;
  entry_path: string;
  vibe_tag: string;
  vibe_check_answers: Array<{ question: string; answer: string }>;
  second_chance: boolean;
  events_attended: number;
  signals: {
    reconnect_count: number;
    poll_score: number;
    check_in_time?: string;
    admin_notes: string[];
  };
}

function ValidationTab() {
  const { getIdToken } = useAuth();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [queue, setQueue] = useState<ValidationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState("");
  const [noteUserId, setNoteUserId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [eventId, setEventId] = useState("");

  // Fetch events for dropdown
  useEffect(() => {
    async function fetchEvents() {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch(`${API_URL}/api/admin/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.data) setEvents(data.data);
      } catch {}
    }
    fetchEvents();
  }, [getIdToken]);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const url = eventId
        ? `${API_URL}/api/admin/validation-queue?event_id=${eventId}`
        : `${API_URL}/api/admin/validation-queue`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) setQueue(data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [eventId, getIdToken]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  async function handleValidate(userId: string, decision: string) {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/validate`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decision, event_id: eventId || undefined }),
      });
      if (res.ok) {
        setActionStatus(`User ${decision === "approved" ? "approved" : decision === "another_chance" ? "given another chance" : "revoked"}!`);
        fetchQueue();
        setTimeout(() => setActionStatus(""), 3000);
      }
    } catch (err) {
      setActionStatus(`Error: ${err}`);
    }
  }

  async function addNote(userId: string) {
    if (!noteText || !eventId) return;
    try {
      const token = await getIdToken();
      if (!token) return;
      await fetch(`${API_URL}/api/admin/events/${eventId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId, note: noteText }),
      });
      setNoteUserId(null);
      setNoteText("");
      fetchQueue();
    } catch {}
  }

  return (
    <div className="w-full space-y-6 sm:max-w-3xl">
      <div>
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
          filter by event (optional)
        </label>
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none"
        >
          <option value="">All events</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} ({new Date(e.date).toLocaleDateString()}) • {e.status}
            </option>
          ))}
        </select>
      </div>

      {actionStatus && (
        <div className="rounded-xl bg-caramel/10 px-4 py-3 font-mono text-[12px] text-caramel">
          {actionStatus}
        </div>
      )}

      <p className="font-mono text-[10px] text-muted">
        {queue.length} provisional user{queue.length !== 1 ? "s" : ""} pending validation
      </p>

      {loading ? (
        <p className="py-8 text-center font-mono text-sm text-muted">loading...</p>
      ) : queue.length === 0 ? (
        <p className="py-8 text-center font-mono text-sm text-muted">
          no provisional users in queue
        </p>
      ) : (
        <div className="space-y-3">
          {queue.map((item) => (
            <div
              key={item.user_id}
              className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]"
            >
              <button
                onClick={() => setExpandedId(expandedId === item.user_id ? null : item.user_id)}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lavender/20 font-serif text-sm text-lavender">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-sans text-sm font-medium text-cream">{item.name}</p>
                    <p className="font-mono text-[10px] text-muted">
                      @{item.handle} &middot; via {item.entry_path}
                      {item.second_chance && " &middot; 2nd chance"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Signal badges */}
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-sage/15 px-2 py-0.5 font-mono text-[9px] text-sage">
                      {item.signals.reconnect_count} reconnects
                    </span>
                    <span className="rounded-full bg-caramel/15 px-2 py-0.5 font-mono text-[9px] text-caramel">
                      {item.signals.poll_score}% approval
                    </span>
                  </div>
                </div>
              </button>

              {expandedId === item.user_id && (
                <div className="border-t border-white/5 px-5 pb-5 pt-4 space-y-4">
                  {/* Signals */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-white/5 p-3 text-center">
                      <p className={`${instrumentSerif.className} text-xl text-cream`}>
                        {item.signals.reconnect_count}
                      </p>
                      <p className="font-mono text-[9px] text-muted">reconnects</p>
                    </div>
                    <div className="rounded-lg bg-white/5 p-3 text-center">
                      <p className={`${instrumentSerif.className} text-xl text-cream`}>
                        {item.signals.poll_score}%
                      </p>
                      <p className="font-mono text-[9px] text-muted">poll score</p>
                    </div>
                    <div className="rounded-lg bg-white/5 p-3 text-center">
                      <p className={`${instrumentSerif.className} text-xl text-cream`}>
                        {item.events_attended}
                      </p>
                      <p className="font-mono text-[9px] text-muted">events</p>
                    </div>
                  </div>

                  {/* Vibe answers */}
                  {item.vibe_check_answers.length > 0 && (
                    <div>
                      <p className="mb-2 font-mono text-[10px] uppercase tracking-[1px] text-muted">
                        vibe check answers
                      </p>
                      {item.vibe_check_answers.map((a, i) => (
                        <div key={i} className="mb-2">
                          <p className="font-mono text-[9px] text-muted">{a.question}</p>
                          <p className="font-sans text-[12px] text-cream/80">{a.answer}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Admin notes */}
                  {item.signals.admin_notes.length > 0 && (
                    <div>
                      <p className="mb-2 font-mono text-[10px] uppercase tracking-[1px] text-muted">notes</p>
                      {item.signals.admin_notes.map((note, i) => (
                        <p key={i} className="mb-1 font-sans text-[12px] text-cream/60">
                          &bull; {note}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Add note */}
                  {noteUserId === item.user_id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add a note..."
                        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[11px] text-cream placeholder:text-muted/30 focus:outline-none"
                      />
                      <button
                        onClick={() => addNote(item.user_id)}
                        className="rounded-lg bg-white/10 px-3 py-2 font-mono text-[10px] text-cream"
                      >
                        save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setNoteUserId(item.user_id)}
                      className="font-mono text-[10px] text-caramel hover:underline"
                    >
                      + add note
                    </button>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:gap-3">
                    <button
                      onClick={() => handleValidate(item.user_id, "approved")}
                      className="rounded-lg bg-sage px-5 py-2.5 font-mono text-[11px] font-medium text-white transition-opacity hover:opacity-80"
                    >
                      approve
                    </button>
                    {!item.second_chance && (
                      <button
                        onClick={() => handleValidate(item.user_id, "another_chance")}
                        className="rounded-lg bg-caramel/30 px-5 py-2.5 font-mono text-[11px] font-medium text-caramel transition-opacity hover:opacity-80"
                      >
                        another chance
                      </button>
                    )}
                    <button
                      onClick={() => handleValidate(item.user_id, "revoked")}
                      className="rounded-lg bg-terracotta/20 px-5 py-2.5 font-mono text-[11px] font-medium text-terracotta transition-opacity hover:opacity-80"
                    >
                      revoke
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Content ────────────────────────────────────────

interface EventOption {
  id: string;
  title: string;
  date: string;
  status: string;
}

function ContentTab() {
  const { getIdToken } = useAuth();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventId, setEventId] = useState("");
  const [polaroidUrl, setPolaroidUrl] = useState("");
  const [polaroidCaption, setPolaroidCaption] = useState("");
  const [polaroidWho, setPolaroidWho] = useState("");
  const [quoteText, setQuoteText] = useState("");
  const [quoteContext, setQuoteContext] = useState("");
  const [statsAttended, setStatsAttended] = useState("");
  const [statsPhones, setStatsPhones] = useState("");
  const [statsDrinks, setStatsDrinks] = useState("");
  const [statsHours, setStatsHours] = useState("");
  const [status, setStatus] = useState("");

  // Fetch events for dropdown
  useEffect(() => {
    async function fetchEvents() {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch(`${API_URL}/api/admin/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.data) setEvents(data.data);
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setLoadingEvents(false);
      }
    }
    fetchEvents();
  }, [getIdToken]);

  async function addPolaroid() {
    if (!eventId || !polaroidUrl) return;
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/events/${eventId}/polaroids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: polaroidUrl, caption: polaroidCaption, who: polaroidWho }),
      });
      if (res.ok) {
        setStatus("Polaroid added!");
        setPolaroidUrl("");
        setPolaroidCaption("");
        setPolaroidWho("");
      }
    } catch (err) {
      setStatus(`Error: ${err}`);
    }
  }

  async function addQuote() {
    if (!eventId || !quoteText) return;
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/events/${eventId}/quotes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quote: quoteText, context: quoteContext }),
      });
      if (res.ok) {
        setStatus("Quote added!");
        setQuoteText("");
        setQuoteContext("");
      }
    } catch (err) {
      setStatus(`Error: ${err}`);
    }
  }

  async function updateStats() {
    if (!eventId) return;
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/events/${eventId}/stats`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          attended: parseInt(statsAttended) || 0,
          phones: parseInt(statsPhones) || 0,
          drinks: parseInt(statsDrinks) || 0,
          hours: statsHours || "0",
        }),
      });
      if (res.ok) setStatus("Stats updated!");
    } catch (err) {
      setStatus(`Error: ${err}`);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-muted">select event</label>
        {loadingEvents ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-muted">
            Loading events...
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-muted">
            No events found. Create an event first.
          </div>
        ) : (
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none"
          >
            <option value="">Choose an event...</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} ({new Date(event.date).toLocaleDateString()}) • {event.status}
              </option>
            ))}
          </select>
        )}
      </div>

      {status && (
        <div className="rounded-xl bg-caramel/10 px-4 py-3 font-mono text-[12px] text-caramel">{status}</div>
      )}

      <section className="rounded-xl border border-white/5 p-5">
        <h3 className="mb-4 font-mono text-[11px] uppercase tracking-[2px] text-cream">add polaroid</h3>
        <div className="space-y-3">
          <input type="text" value={polaroidUrl} onChange={(e) => setPolaroidUrl(e.target.value)} placeholder="Image URL..." className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none" />
          <div className="flex gap-3">
            <input type="text" value={polaroidCaption} onChange={(e) => setPolaroidCaption(e.target.value)} placeholder="Caption..." className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none" />
            <input type="text" value={polaroidWho} onChange={(e) => setPolaroidWho(e.target.value)} placeholder="Who..." className="w-32 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none" />
          </div>
          <button onClick={addPolaroid} className="rounded-lg bg-caramel px-5 py-2.5 font-mono text-[11px] font-medium text-near-black transition-opacity hover:opacity-80">add polaroid</button>
        </div>
      </section>

      <section className="rounded-xl border border-white/5 p-5">
        <h3 className="mb-4 font-mono text-[11px] uppercase tracking-[2px] text-cream">add overheard quote</h3>
        <div className="space-y-3">
          <input type="text" value={quoteText} onChange={(e) => setQuoteText(e.target.value)} placeholder="Quote..." className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none" />
          <input type="text" value={quoteContext} onChange={(e) => setQuoteContext(e.target.value)} placeholder="Context..." className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none" />
          <button onClick={addQuote} className="rounded-lg bg-caramel px-5 py-2.5 font-mono text-[11px] font-medium text-near-black transition-opacity hover:opacity-80">add quote</button>
        </div>
      </section>

      <section className="rounded-xl border border-white/5 p-5">
        <h3 className="mb-4 font-mono text-[11px] uppercase tracking-[2px] text-cream">event stats</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-mono text-[9px] text-muted">attended</label>
            <input type="number" value={statsAttended} onChange={(e) => setStatsAttended(e.target.value)} placeholder="0" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[9px] text-muted">phones locked</label>
            <input type="number" value={statsPhones} onChange={(e) => setStatsPhones(e.target.value)} placeholder="0" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[9px] text-muted">drinks served</label>
            <input type="number" value={statsDrinks} onChange={(e) => setStatsDrinks(e.target.value)} placeholder="0" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[9px] text-muted">hours offline</label>
            <input type="text" value={statsHours} onChange={(e) => setStatsHours(e.target.value)} placeholder="0" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none" />
          </div>
        </div>
        <button onClick={updateStats} className="mt-4 rounded-lg bg-caramel px-5 py-2.5 font-mono text-[11px] font-medium text-near-black transition-opacity hover:opacity-80">update stats</button>
      </section>

      <NotificationComposer />
    </div>
  );
}

// ── Push Notification Composer ─────────────────────

interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  audience: string;
  sent_count: number;
  failed_count: number;
  sent_at: string;
}

function NotificationComposer() {
  const { getIdToken } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");
  const [history, setHistory] = useState<NotificationRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) setHistory(data.data);
    } catch {}
  }, [getIdToken]);

  useEffect(() => {
    if (showHistory) fetchHistory();
  }, [showHistory, fetchHistory]);

  async function handleSend() {
    if (!title || !body) return;
    setSending(true);
    setResult("");
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, body, audience }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(`Sent to ${data.data.sent} users (${data.data.failed} failed)`);
        setTitle("");
        setBody("");
        if (showHistory) fetchHistory();
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch (err) {
      setResult(`Network error: ${err}`);
    } finally {
      setSending(false);
      setTimeout(() => setResult(""), 5000);
    }
  }

  const AUDIENCE_LABELS: Record<string, string> = {
    all: "all users",
    active: "active members",
    provisional: "provisional users",
  };

  return (
    <section className="rounded-xl border border-white/5 p-5">
      <h3 className="mb-4 font-mono text-[11px] uppercase tracking-[2px] text-cream">push notifications</h3>

      {result && (
        <div className="mb-4 rounded-lg bg-caramel/10 px-4 py-2.5 font-mono text-[11px] text-caramel">
          {result}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="mb-1 block font-mono text-[9px] text-muted">audience</label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none"
          >
            <option value="all">All users</option>
            <option value="active">Active members only</option>
            <option value="provisional">Provisional users only</option>
          </select>
          <p className="mt-1 font-mono text-[9px] text-muted/50">
            or paste an event ID to target its ticket holders
          </p>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Notification title..."
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Notification body..."
          rows={3}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={handleSend}
            disabled={sending || !title || !body}
            className="rounded-lg bg-caramel px-5 py-2.5 font-mono text-[11px] font-medium text-near-black transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {sending ? "sending..." : "send now"}
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="font-mono text-[10px] text-muted hover:text-cream"
          >
            {showHistory ? "hide history" : "show history"}
          </button>
        </div>
      </div>

      {showHistory && history.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[1px] text-muted">recent notifications</p>
          {history.map((n) => (
            <div key={n.id} className="rounded-lg bg-white/5 px-4 py-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-sans text-[13px] font-medium text-cream">{n.title}</p>
                  <p className="font-mono text-[11px] text-cream/60">{n.body}</p>
                </div>
                <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 font-mono text-[9px] text-muted">
                  {AUDIENCE_LABELS[n.audience] || n.audience}
                </span>
              </div>
              <p className="mt-2 font-mono text-[9px] text-muted/50">
                {new Date(n.sent_at).toLocaleString()} &middot; {n.sent_count} sent, {n.failed_count} failed
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Applications ───────────────────────────────────

interface Application {
  id: string;
  name: string;
  answers: Array<{ question: string; answer: string }>;
  status: string;
  submitted_at: string;
  invite_code?: string;
}

function ApplicationsTab() {
  const { getIdToken } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState("");

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/applications?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) setApplications(data.data);
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, getIdToken]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  async function handleAction(id: string, action: "approve" | "reject") {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/applications/${id}/${action}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setActionStatus(`Application ${action}d!`);
        fetchApplications();
        setTimeout(() => setActionStatus(""), 3000);
      }
    } catch (err) {
      setActionStatus(`Error: ${err}`);
    }
  }

  return (
    <div className="w-full space-y-6 sm:max-w-3xl">
      <div className="flex flex-wrap gap-2">
        {["pending", "approved", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] transition-colors sm:px-4 sm:py-2 sm:text-[11px] ${
              filter === f ? "bg-caramel text-near-black" : "bg-white/5 text-muted hover:text-cream"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {actionStatus && (
        <div className="rounded-xl bg-caramel/10 px-4 py-3 font-mono text-[12px] text-caramel">{actionStatus}</div>
      )}

      {loading ? (
        <p className="py-8 text-center font-mono text-sm text-muted">loading...</p>
      ) : applications.length === 0 ? (
        <p className="py-8 text-center font-mono text-sm text-muted">no {filter} applications</p>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div key={app.id} className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
              <button
                onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div>
                  <p className="font-sans text-sm font-medium text-cream">{app.name}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted">
                    {new Date(app.submitted_at).toLocaleDateString()} &middot; {app.answers.length} answers
                  </p>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 font-mono text-[9px] uppercase"
                  style={{
                    color: app.status === "pending" ? "#D4A574" : app.status === "approved" ? "#6B7A63" : "#D4836B",
                    background: app.status === "pending" ? "#D4A57415" : app.status === "approved" ? "#6B7A6315" : "#D4836B15",
                  }}
                >
                  {app.status}
                </span>
              </button>

              {expandedId === app.id && (
                <div className="border-t border-white/5 px-5 pb-5 pt-4">
                  <div className="space-y-4">
                    {app.answers.map((a, i) => (
                      <div key={i}>
                        <p className="mb-1 font-mono text-[10px] uppercase tracking-[1px] text-muted">{a.question}</p>
                        <p className="font-sans text-sm text-cream/80">{a.answer}</p>
                      </div>
                    ))}
                  </div>
                  {app.invite_code && (
                    <div className="mt-4 rounded-lg bg-sage/10 px-4 py-3">
                      <p className="font-mono text-[11px] text-sage">invite code: <strong>{app.invite_code}</strong></p>
                    </div>
                  )}
                  {app.status === "pending" && (
                    <div className="mt-5 flex gap-3">
                      <button onClick={() => handleAction(app.id, "approve")} className="rounded-lg bg-sage px-5 py-2.5 font-mono text-[11px] font-medium text-white transition-opacity hover:opacity-80">approve</button>
                      <button onClick={() => handleAction(app.id, "reject")} className="rounded-lg bg-terracotta/80 px-5 py-2.5 font-mono text-[11px] font-medium text-white transition-opacity hover:opacity-80">reject</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Members ────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  handle: string;
  vibe_tag: string;
  entry_path: string;
  status: string;
  vouched_by?: string;
  created_at: string;
}

function MembersTab() {
  const { getIdToken } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function fetchMembers() {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch(`${API_URL}/api/admin/members`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.data) setMembers(data.data);
      } catch (err) {
        console.error("Failed to fetch members:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMembers();
  }, [getIdToken]);

  const filtered = members.filter((m) => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (search) {
      return (
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.handle.toLowerCase().includes(search.toLowerCase())
      );
    }
    return true;
  });

  const ENTRY_LABELS: Record<string, string> = {
    invite: "invite code",
    vouch: "vouch code",
    chatbot: "chatbot",
    prove: "proved",
  };

  const STATUS_COLORS: Record<string, string> = {
    active: "#6B7A63",
    provisional: "#8B7EC8",
    inactive: "#D4836B",
  };

  return (
    <div className="w-full space-y-6 sm:max-w-3xl">
      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none"
        >
          <option value="all">all</option>
          <option value="active">active</option>
          <option value="provisional">provisional</option>
          <option value="inactive">inactive</option>
        </select>
      </div>

      <p className="font-mono text-[10px] text-muted">
        {filtered.length} member{filtered.length !== 1 ? "s" : ""}
      </p>

      {loading ? (
        <p className="py-8 text-center font-mono text-sm text-muted">loading...</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full font-serif text-sm text-white"
                  style={{ background: STATUS_COLORS[member.status] || "#9B8E82" }}
                >
                  {member.name.charAt(0)}
                </div>
                <div>
                  <p className="font-sans text-sm font-medium text-cream">{member.name}</p>
                  <p className="font-mono text-[10px] text-muted">
                    @{member.handle} &middot; {member.vibe_tag}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase"
                  style={{
                    color: STATUS_COLORS[member.status] || "#9B8E82",
                    background: (STATUS_COLORS[member.status] || "#9B8E82") + "15",
                  }}
                >
                  {member.status}
                </span>
                <p className="mt-1 font-mono text-[9px] text-muted/50">
                  via {ENTRY_LABELS[member.entry_path] || member.entry_path}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Invite Codes ───────────────────────────────────

interface SeedCode {
  id: string;
  code: string;
  status: "unused" | "used";
  label?: string;
  used_by_id?: string;
  created_at: string;
  created_by_admin: string;
}

function InviteCodesTab() {
  const { getIdToken } = useAuth();
  const { data: codes, loading, error, refetch } = useApi<SeedCode[]>("/api/admin/vouch-codes", {
    refreshInterval: 0, // Don't auto-refresh - manual refetch after creating codes
  });
  const [creating, setCreating] = useState(false);
  const [count, setCount] = useState("10");
  const [label, setLabel] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function handleCreate() {
    const countNum = parseInt(count, 10);
    if (!countNum || countNum < 1 || countNum > 100) {
      alert("Count must be between 1 and 100");
      return;
    }

    setCreating(true);
    try {
      await apiClient.post("/api/admin/vouch-codes/create", {
        count: countNum,
        label: label.trim() || undefined,
      });

      setCount("10");
      setLabel("");
      setShowForm(false);
      await refetch();
    } catch (err) {
      console.error("Failed to create codes:", err);
      const error = err as Error & { data?: { error?: string } };
      alert(error.data?.error || error.message || "Failed to create codes");
    } finally {
      setCreating(false);
    }
  }

  const totalCodes = codes?.length ?? 0;
  const usedCodes = codes?.filter((c) => c.status === "used").length ?? 0;
  const unusedCodes = totalCodes - usedCodes;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-sm uppercase tracking-[2px] text-cream">
            seed invite codes
          </h2>
          <p className="mt-1 font-mono text-[11px] text-muted">
            bootstrap your community with admin-created codes
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-caramel px-4 py-2 font-mono text-[11px] uppercase tracking-[2px] text-gate-black transition-opacity hover:opacity-80"
        >
          {showForm ? "cancel" : "create codes"}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-xl border border-highlight/20 bg-highlight/5 p-4">
          <p className="font-mono text-xs text-highlight">
            {error.message.includes('Rate limited') || error.message.includes('quota')
              ? '⚠️ Rate limited. Showing cached data. Refreshes automatically.'
              : `❌ ${error.message}`}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted">total</p>
          <p className="mt-1 font-mono text-2xl text-cream">{totalCodes}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted">unused</p>
          <p className="mt-1 font-mono text-2xl text-cream">{unusedCodes}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted">used</p>
          <p className="mt-1 font-mono text-2xl text-cream">{usedCodes}</p>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[2px] text-muted">
              quantity (1-100)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[2px] text-muted">
              label (optional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Founding 50, Press Kit, Launch Event"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
            />
            <p className="mt-1 font-mono text-[10px] text-muted/50">
              helps you track batches of codes
            </p>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full rounded-xl bg-caramel px-4 py-3 font-mono text-[11px] uppercase tracking-[2px] text-gate-black transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {creating ? "creating..." : "generate codes"}
          </button>
        </div>
      )}

      {/* Codes List */}
      {loading ? (
        <p className="py-8 text-center font-mono text-sm text-muted">loading...</p>
      ) : !codes || codes.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="font-mono text-sm text-muted">no codes created yet</p>
          <p className="mt-2 font-mono text-[11px] text-muted/50">
            create your first batch to start inviting members
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {codes.map((code) => (
            <div
              key={code.id}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4"
            >
              <div className="flex items-center gap-4">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: code.status === "used" ? "#6B7A63" : "#8B7EC8" }}
                />
                <div>
                  <p className="font-mono text-sm text-cream">{code.code}</p>
                  {code.label && (
                    <p className="mt-0.5 font-mono text-[10px] text-muted/50">{code.label}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-[11px] uppercase tracking-[2px] text-muted">
                  {code.status}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-muted/50">
                  {new Date(code.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Settings ───────────────────────────────────────

function SettingsTab() {
  const { getIdToken } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [codesFirst, setCodesFirst] = useState("");
  const [codesRepeat, setCodesRepeat] = useState("");
  const [reconnectHours, setReconnectHours] = useState("");
  const [noshowPenalty, setNoshowPenalty] = useState("no_vouch");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    async function fetchSettings() {
      try {
        const token = await getIdToken();
        if (!token) return;
        const [chatRes, vouchRes] = await Promise.all([
          fetch(`${API_URL}/api/admin/settings/chatbot`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/admin/settings/vouch`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const chatData = await chatRes.json();
        const vouchData = await vouchRes.json();

        if (chatData.data) setPrompt(chatData.data.system_prompt || "");
        if (vouchData.data) {
          setCodesFirst(String(vouchData.data.codes_first ?? 2));
          setCodesRepeat(String(vouchData.data.codes_repeat ?? 2));
          setReconnectHours(String(vouchData.data.reconnect_hours ?? 48));
          setNoshowPenalty(vouchData.data.noshow_penalty || "no_vouch");
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [getIdToken]);

  async function saveChatbot() {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/settings/chatbot`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ system_prompt: prompt }),
      });
      if (res.ok) setStatus("Chatbot personality updated!");
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      setStatus(`Error: ${err}`);
    }
  }

  async function saveVouch() {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/settings/vouch`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          codes_first: parseInt(codesFirst) || 2,
          codes_repeat: parseInt(codesRepeat) || 2,
          reconnect_hours: parseInt(reconnectHours) || 48,
          noshow_penalty: noshowPenalty,
        }),
      });
      if (res.ok) setStatus("Vouch settings updated!");
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      setStatus(`Error: ${err}`);
    }
  }

  if (loading) {
    return <p className="py-8 text-center font-mono text-sm text-muted">loading settings...</p>;
  }

  return (
    <div className="max-w-2xl space-y-8">
      {status && (
        <div className="rounded-xl bg-caramel/10 px-4 py-3 font-mono text-[12px] text-caramel">{status}</div>
      )}

      <section className="rounded-xl border border-white/5 p-5">
        <h3 className="mb-4 font-mono text-[11px] uppercase tracking-[2px] text-cream">chatbot personality</h3>
        <p className="mb-3 font-mono text-[10px] text-muted">
          system prompt sent to the chatbot. changes take effect immediately.
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={12}
          className="mb-4 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-[12px] leading-relaxed text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
        />
        <button onClick={saveChatbot} className="rounded-lg bg-caramel px-5 py-2.5 font-mono text-[11px] font-medium text-near-black transition-opacity hover:opacity-80">
          save chatbot personality
        </button>
      </section>

      <section className="rounded-xl border border-white/5 p-5">
        <h3 className="mb-4 font-mono text-[11px] uppercase tracking-[2px] text-cream">vouch settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block font-mono text-[9px] text-muted">codes for first event</label>
            <input type="number" value={codesFirst} onChange={(e) => setCodesFirst(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[9px] text-muted">codes for repeat events</label>
            <input type="number" value={codesRepeat} onChange={(e) => setCodesRepeat(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[9px] text-muted">reconnect window (hours)</label>
            <input type="number" value={reconnectHours} onChange={(e) => setReconnectHours(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[9px] text-muted">no-show penalty</label>
            <select value={noshowPenalty} onChange={(e) => setNoshowPenalty(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none">
              <option value="no_vouch">no vouch codes</option>
              <option value="warning">warning</option>
              <option value="suspension">suspension</option>
            </select>
          </div>
        </div>
        <button onClick={saveVouch} className="mt-4 rounded-lg bg-caramel px-5 py-2.5 font-mono text-[11px] font-medium text-near-black transition-opacity hover:opacity-80">
          save vouch settings
        </button>
      </section>
    </div>
  );
}

// ── Login Screen ───────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await onLogin(email, password);
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gate-black px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className={`${instrumentSerif.className} text-4xl tracking-tight text-cream`}>
            come offline
          </h1>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[3px] text-muted">
            admin panel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[2px] text-muted">
              email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
              placeholder="admin@comeoffline.com"
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[2px] text-muted">
              password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 font-mono text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-caramel px-4 py-3 font-mono text-[11px] uppercase tracking-[2px] text-gate-black transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {loading ? "signing in..." : "sign in"}
          </button>
        </form>

        <p className="text-center font-mono text-[10px] text-muted/50">
          admin access only
        </p>
      </div>
    </div>
  );
}
