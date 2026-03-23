"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { API_URL, instrumentSerif, TICKET_STATUS_COLORS } from "@/lib/constants";
import { apiClient } from "@/lib/apiClient";
import type { Event } from "@comeoffline/types";

interface TicketWithUser {
  id: string;
  user_id: string;
  event_id: string;
  tier_id: string;
  tier_name: string;
  price: number;
  quantity: number;
  status: string;
  qr_code: string;
  pickup_point: string;
  time_slot?: string;
  add_ons?: Array<{ addon_id: string; name: string; quantity: number; price: number }>;
  seat_id?: string;
  section_id?: string;
  section_name?: string;
  spot_id?: string;
  spot_name?: string;
  spot_seat_id?: string;
  spot_seat_label?: string;
  purchased_at: string;
  checked_in_at?: string;
  cancelled_at?: string;
  confirmed_at?: string;
  user_name?: string;
  user_handle?: string;
  event_title?: string;
  event_emoji?: string;
  event_date?: string;
}

interface PaginatedTickets {
  tickets: TicketWithUser[];
  total: number;
  page: number;
  total_pages: number;
}

interface BookingsStats {
  total_revenue: number;
  today_revenue: number;
  tickets_sold: number;
  avg_ticket_price: number;
  addon_revenue: number;
  per_event: Array<{
    event_id: string;
    event_title: string;
    event_emoji: string;
    revenue: number;
    ticket_count: number;
    per_tier: Array<{ tier_name: string; revenue: number; count: number }>;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "pending",
  confirmed: "confirmed",
  cancelled: "cancelled",
  checked_in: "checked in",
  no_show: "no show",
};

function formatPrice(rupees: number): string {
  return `₹${rupees.toLocaleString("en-IN")}`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
}

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BookingsTab() {
  const { getIdToken } = useAuth();

  // Filters
  const [eventFilter, setEventFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "price">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  // Data
  const [ticketsData, setTicketsData] = useState<PaginatedTickets | null>(null);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  // Drawer
  const [drawerTicket, setDrawerTicket] = useState<TicketWithUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Revenue breakdown
  const [showRevenue, setShowRevenue] = useState(false);

  // Events list for filter dropdown
  const { data: events } = useApi<Event[]>("/api/admin/events");

  // Stats
  const { data: stats, refetch: refetchStats } = useApi<BookingsStats>("/api/admin/bookings/stats");

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;

      const params = new URLSearchParams();
      if (eventFilter) params.set("event_id", eventFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      if (fromDate) params.set("from_date", fromDate);
      if (toDate) params.set("to_date", toDate);
      params.set("sort_by", sortBy);
      params.set("sort_dir", sortDir);
      params.set("page", String(page));
      params.set("limit", "50");

      const res = await fetch(`${API_URL}/api/admin/bookings?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTicketsData(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    } finally {
      setTicketsLoading(false);
    }
  }, [getIdToken, eventFilter, statusFilter, search, fromDate, toDate, sortBy, sortDir, page]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [eventFilter, statusFilter, search, fromDate, toDate, sortBy, sortDir]);

  const openDrawer = useCallback((ticket: TicketWithUser) => {
    setDrawerTicket(ticket);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerTicket(null);
  }, []);

  const handleCancel = useCallback(async (ticketId: string) => {
    if (!window.confirm("Cancel this ticket? This will release the spot and cannot be undone.")) return;
    setActionLoading(true);
    try {
      apiClient.setTokenProvider(getIdToken);
      await apiClient.post(`/api/admin/bookings/${ticketId}/cancel`, { reason: "admin_cancelled" });
      // Update drawer ticket status
      setDrawerTicket((prev) => prev ? { ...prev, status: "cancelled", cancelled_at: new Date().toISOString() } : null);
      // Refresh list and stats
      fetchTickets();
      refetchStats();
    } catch (err) {
      console.error("Failed to cancel ticket:", err);
      alert("Failed to cancel ticket");
    } finally {
      setActionLoading(false);
    }
  }, [getIdToken, fetchTickets, refetchStats]);

  const handleConfirm = useCallback(async (ticketId: string) => {
    if (!window.confirm("Confirm this ticket? This will mark payment as received.")) return;
    setActionLoading(true);
    try {
      apiClient.setTokenProvider(getIdToken);
      await apiClient.post(`/api/admin/bookings/${ticketId}/confirm`);
      setDrawerTicket((prev) => prev ? { ...prev, status: "confirmed", confirmed_at: new Date().toISOString() } : null);
      fetchTickets();
      refetchStats();
    } catch (err) {
      console.error("Failed to confirm ticket:", err);
      alert("Failed to confirm ticket");
    } finally {
      setActionLoading(false);
    }
  }, [getIdToken, fetchTickets, refetchStats]);

  const handleExport = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;

      const params = new URLSearchParams();
      if (eventFilter) params.set("event_id", eventFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      if (fromDate) params.set("from_date", fromDate);
      if (toDate) params.set("to_date", toDate);

      const res = await fetch(`${API_URL}/api/admin/bookings/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookings-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export:", err);
    }
  }, [getIdToken, eventFilter, statusFilter, search, fromDate, toDate]);

  const tickets = ticketsData?.tickets || [];

  return (
    <>
      <div className="max-w-5xl space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "total revenue", value: stats ? formatPrice(stats.total_revenue) : "—", emoji: "💰" },
            { label: "today", value: stats ? formatPrice(stats.today_revenue) : "—", emoji: "📈" },
            { label: "tickets sold", value: stats?.tickets_sold ?? "—", emoji: "🎟️" },
            { label: "avg price", value: stats ? formatPrice(stats.avg_ticket_price) : "—", emoji: "📊" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <span className="mb-1 block text-lg">{stat.emoji}</span>
              <p className={`${instrumentSerif.className} text-2xl text-cream`}>{stat.value}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[1.5px] text-muted">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Revenue breakdown toggle */}
        {stats && stats.per_event.length > 0 && (
          <div className="rounded-xl border border-white/5 bg-white/[0.02]">
            <button
              onClick={() => setShowRevenue(!showRevenue)}
              className="flex w-full items-center justify-between px-5 py-3.5 text-left"
            >
              <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-muted">
                revenue by event
              </span>
              <svg
                className={`h-4 w-4 text-muted transition-transform ${showRevenue ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showRevenue && (
              <div className="border-t border-white/5">
                {stats.per_event.map((ev) => (
                  <div key={ev.event_id} className="border-b border-white/5 px-5 py-3.5 last:border-b-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{ev.event_emoji}</span>
                        <span className="text-sm text-cream">{ev.event_title}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-sm text-cream">{formatPrice(ev.revenue)}</span>
                        <span className="ml-2 font-mono text-[10px] text-muted">
                          {ev.ticket_count} ticket{ev.ticket_count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    {ev.per_tier.length > 1 && (
                      <div className="mt-2 space-y-1 pl-8">
                        {ev.per_tier.map((tier) => (
                          <div key={tier.tier_name} className="flex items-center justify-between font-mono text-[10px] text-muted">
                            <span>{tier.tier_name}</span>
                            <span>{formatPrice(tier.revenue)} &middot; {tier.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {stats.addon_revenue > 0 && (
                  <div className="border-t border-white/5 px-5 py-3 font-mono text-[10px] text-muted">
                    add-on revenue: {formatPrice(stats.addon_revenue)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or handle..."
            className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
          />
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none"
          >
            <option value="">all events</option>
            {events?.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.emoji} {ev.title}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none"
          >
            <option value="all">all status</option>
            <option value="confirmed">confirmed</option>
            <option value="checked_in">checked in</option>
            <option value="pending_payment">pending</option>
            <option value="cancelled">cancelled</option>
            <option value="no_show">no show</option>
          </select>
        </div>

        {/* Date range + sort + export row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted">from</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[11px] text-cream focus:border-caramel/50 focus:outline-none"
            />
            <span className="font-mono text-[10px] text-muted">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[11px] text-cream focus:border-caramel/50 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortBy(sortBy === "date" ? "price" : "date")}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[1px] text-muted transition-colors hover:bg-white/10 hover:text-cream"
            >
              sort: {sortBy}
            </button>
            <button
              onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[10px] text-muted transition-colors hover:bg-white/10 hover:text-cream"
            >
              {sortDir === "desc" ? "↓" : "↑"}
            </button>
          </div>
          <button
            onClick={handleExport}
            className="ml-auto rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-mono text-[10px] uppercase tracking-[1px] text-muted transition-colors hover:bg-white/10 hover:text-cream"
          >
            export csv
          </button>
        </div>

        {/* Count */}
        <p className="font-mono text-[10px] text-muted">
          {ticketsData ? `${ticketsData.total} booking${ticketsData.total !== 1 ? "s" : ""}` : "—"}
        </p>

        {/* Tickets list */}
        {ticketsLoading ? (
          <p className="py-8 text-center font-mono text-sm text-muted">loading bookings...</p>
        ) : tickets.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-12 text-center">
            <p className="font-mono text-sm text-muted">no bookings found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => openDrawer(ticket)}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full font-serif text-sm text-white"
                    style={{ background: TICKET_STATUS_COLORS[ticket.status] || "#9B8E82" }}
                  >
                    {(ticket.user_name || "?").charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-cream">{ticket.user_name || "Unknown"}</p>
                    <p className="font-mono text-[10px] text-muted">
                      @{ticket.user_handle} &middot; {ticket.event_emoji} {ticket.event_title}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden text-right sm:block">
                    <p className="font-mono text-sm text-cream">{formatPrice(ticket.price)}</p>
                    <p className="font-mono text-[9px] text-muted">{ticket.tier_name}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase"
                      style={{
                        color: TICKET_STATUS_COLORS[ticket.status] || "#9B8E82",
                        background: (TICKET_STATUS_COLORS[ticket.status] || "#9B8E82") + "15",
                      }}
                    >
                      {STATUS_LABELS[ticket.status] || ticket.status}
                    </span>
                    <p className="mt-1 font-mono text-[9px] text-muted/50">
                      {formatDate(ticket.purchased_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {ticketsData && ticketsData.total_pages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-mono text-[10px] uppercase tracking-[1px] text-muted transition-colors hover:bg-white/10 hover:text-cream disabled:opacity-30 disabled:hover:bg-white/5"
            >
              prev
            </button>
            <span className="font-mono text-[10px] text-muted">
              {page} / {ticketsData.total_pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(ticketsData.total_pages, p + 1))}
              disabled={page >= ticketsData.total_pages}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-mono text-[10px] uppercase tracking-[1px] text-muted transition-colors hover:bg-white/10 hover:text-cream disabled:opacity-30 disabled:hover:bg-white/5"
            >
              next
            </button>
          </div>
        )}
      </div>

      {/* Slide-out drawer */}
      {drawerTicket && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={closeDrawer}
          />

          {/* Drawer */}
          <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/5 bg-gate-black shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <h3 className="font-mono text-[11px] uppercase tracking-[2px] text-cream">ticket detail</h3>
              <button
                onClick={closeDrawer}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-cream"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-6">
                {/* User info */}
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full font-serif text-lg text-white"
                    style={{ background: TICKET_STATUS_COLORS[drawerTicket.status] || "#9B8E82" }}
                  >
                    {(drawerTicket.user_name || "?").charAt(0)}
                  </div>
                  <div>
                    <p className="text-base font-medium text-cream">{drawerTicket.user_name || "Unknown"}</p>
                    <p className="font-mono text-[11px] text-muted">@{drawerTicket.user_handle}</p>
                  </div>
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[1px]"
                    style={{
                      color: TICKET_STATUS_COLORS[drawerTicket.status] || "#9B8E82",
                      background: (TICKET_STATUS_COLORS[drawerTicket.status] || "#9B8E82") + "20",
                    }}
                  >
                    {STATUS_LABELS[drawerTicket.status] || drawerTicket.status}
                  </span>
                </div>

                {/* Event info */}
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[1.5px] text-muted">event</p>
                  <p className="text-sm text-cream">
                    {drawerTicket.event_emoji} {drawerTicket.event_title}
                  </p>
                  {drawerTicket.event_date && (
                    <p className="mt-1 font-mono text-[10px] text-muted">{drawerTicket.event_date}</p>
                  )}
                </div>

                {/* Ticket details */}
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[1.5px] text-muted">ticket info</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-mono text-[11px] text-muted">tier</span>
                      <span className="font-mono text-[11px] text-cream">{drawerTicket.tier_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-[11px] text-muted">price</span>
                      <span className="font-mono text-[11px] text-cream">{formatPrice(drawerTicket.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-[11px] text-muted">quantity</span>
                      <span className="font-mono text-[11px] text-cream">{drawerTicket.quantity || 1}</span>
                    </div>
                    {drawerTicket.pickup_point && (
                      <div className="flex justify-between">
                        <span className="font-mono text-[11px] text-muted">pickup</span>
                        <span className="font-mono text-[11px] text-cream">{drawerTicket.pickup_point}</span>
                      </div>
                    )}
                    {(drawerTicket.section_name || drawerTicket.spot_name || drawerTicket.seat_id) && (
                      <div className="flex justify-between">
                        <span className="font-mono text-[11px] text-muted">seating</span>
                        <span className="font-mono text-[11px] text-cream">
                          {drawerTicket.spot_name
                            ? `${drawerTicket.spot_name}${drawerTicket.spot_seat_label ? `, ${drawerTicket.spot_seat_label}` : ""}`
                            : drawerTicket.section_name || drawerTicket.seat_id}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Add-ons */}
                {drawerTicket.add_ons && drawerTicket.add_ons.length > 0 && (
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <p className="mb-3 font-mono text-[10px] uppercase tracking-[1.5px] text-muted">add-ons</p>
                    <div className="space-y-2">
                      {drawerTicket.add_ons.map((addon, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="font-mono text-[11px] text-cream">
                            {addon.name} &times;{addon.quantity}
                          </span>
                          <span className="font-mono text-[11px] text-muted">
                            {formatPrice(addon.price * addon.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[1.5px] text-muted">timeline</p>
                  <div className="space-y-3">
                    {[
                      { label: "purchased", time: drawerTicket.purchased_at, active: true },
                      { label: "confirmed", time: drawerTicket.confirmed_at, active: !!drawerTicket.confirmed_at || drawerTicket.status === "confirmed" || drawerTicket.status === "checked_in" },
                      { label: "checked in", time: drawerTicket.checked_in_at, active: drawerTicket.status === "checked_in" },
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div
                          className={`h-2 w-2 rounded-full ${step.active ? "bg-sage" : "bg-white/10"}`}
                        />
                        <span className={`font-mono text-[11px] ${step.active ? "text-cream" : "text-muted/40"}`}>
                          {step.label}
                        </span>
                        {step.time && step.active && (
                          <span className="ml-auto font-mono text-[10px] text-muted">
                            {formatDateTime(step.time)}
                          </span>
                        )}
                      </div>
                    ))}
                    {drawerTicket.status === "cancelled" && (
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-terracotta" />
                        <span className="font-mono text-[11px] text-terracotta">cancelled</span>
                        {drawerTicket.cancelled_at && (
                          <span className="ml-auto font-mono text-[10px] text-muted">
                            {formatDateTime(drawerTicket.cancelled_at)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* QR Code */}
                {drawerTicket.qr_code && drawerTicket.status !== "cancelled" && (
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <p className="mb-3 font-mono text-[10px] uppercase tracking-[1.5px] text-muted">qr code</p>
                    <div className="flex justify-center">
                      <img
                        src={drawerTicket.qr_code}
                        alt="Ticket QR Code"
                        className="h-32 w-32 rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {/* Ticket ID */}
                <p className="font-mono text-[9px] text-muted/30 break-all">
                  id: {drawerTicket.id}
                </p>
              </div>
            </div>

            {/* Actions footer */}
            {(drawerTicket.status === "pending_payment" || drawerTicket.status === "confirmed") && (
              <div className="border-t border-white/5 px-6 py-4">
                <div className="flex gap-3">
                  {drawerTicket.status === "pending_payment" && (
                    <button
                      onClick={() => handleConfirm(drawerTicket.id)}
                      disabled={actionLoading}
                      className="flex-1 rounded-xl bg-sage/20 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[2px] text-sage transition-colors hover:bg-sage/30 disabled:opacity-50"
                    >
                      {actionLoading ? "..." : "confirm"}
                    </button>
                  )}
                  <button
                    onClick={() => handleCancel(drawerTicket.id)}
                    disabled={actionLoading}
                    className="flex-1 rounded-xl bg-terracotta/20 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[2px] text-terracotta transition-colors hover:bg-terracotta/30 disabled:opacity-50"
                  >
                    {actionLoading ? "..." : "cancel ticket"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
