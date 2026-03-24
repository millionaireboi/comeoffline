"use client";

import { formatDate } from "@comeoffline/ui";
import { useApi } from "@/hooks/useApi";
import { instrumentSerif } from "@/lib/constants";
import { TabLoadingSkeleton } from "@/components/Skeleton";
import type { Event } from "@comeoffline/types";

interface DashboardInit {
  stats: Record<string, number | string>;
  events: Event[];
}

export function DashboardTab() {
  const { data: initData, loading: statsLoading, error: statsError } = useApi<DashboardInit>(
    "/api/admin/dashboard-init",
    { dedupingInterval: 5 * 60 * 1000, cacheTime: 15 * 60 * 1000 }
  );
  const stats = initData?.stats ?? null;
  const events = initData?.events ?? null;

  const items = [
    { label: "total members", value: stats?.total_members ?? "—", emoji: "👥" },
    { label: "active events", value: stats?.active_events ?? "—", emoji: "🎪" },
    { label: "total tickets", value: stats?.total_tickets ?? "—", emoji: "🎟️" },
    { label: "vouch codes used", value: stats?.vouch_codes_used ?? "—", emoji: "✉️" },
    { label: "provisional users", value: stats?.provisional_users ?? "—", emoji: "🌱" },
    { label: "total revenue", value: stats?.total_revenue != null ? `₹${stats.total_revenue}` : "—", emoji: "💰" },
    { label: "unread contacts", value: stats?.contact_unread ?? "—", emoji: "📬" },
    { label: "new brand leads", value: stats?.brand_new ?? "—", emoji: "🤝" },
  ];

  const lastEvent = events?.find((e) => e.status === "completed");
  const upcomingEvents = events?.filter((e) => ["upcoming", "live", "draft"].includes(e.status)) || [];

  if (statsLoading && !stats) {
    return <TabLoadingSkeleton />;
  }

  return (
    <div className="space-y-5">
      {statsError && (
        <div className="rounded-xl border border-terracotta/20 bg-terracotta/5 px-4 py-3 font-mono text-xs text-terracotta">
          {statsError.message}
        </div>
      )}

      {/* Stats grid */}
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

      {/* Last Event Card */}
      {lastEvent && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-3.5">
            <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-muted">last event</span>
            <span
              className="rounded-full px-2.5 py-0.5 font-mono text-[10px]"
              style={{
                color: lastEvent.accent || "#DBBCAC",
                background: (lastEvent.accent || "#DBBCAC") + "15",
              }}
            >
              {lastEvent.emoji} {lastEvent.title.toLowerCase()}
            </span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: `${lastEvent.spots_taken}/${lastEvent.total_spots}`, label: "attended", color: "#A8B5A0" },
                { value: lastEvent.total_spots > 0 ? `${Math.round((lastEvent.spots_taken / lastEvent.total_spots) * 100)}%` : "—", label: "show rate", color: "#FAF6F0" },
                { value: "—", label: "connected", color: "#D4A574" },
              ].map((s, i) => (
                <div key={i} className="rounded-lg bg-white/[0.04] p-3.5 text-center">
                  <div className="font-mono text-xl font-medium" style={{ color: s.color }}>{s.value}</div>
                  <div className="mt-1 text-[10px] text-muted">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Events Card */}
      {upcomingEvents.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
          <div className="border-b border-white/5 px-5 py-3.5">
            <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-muted">upcoming events</span>
          </div>
          {upcomingEvents.map((ev, i) => (
            <div
              key={ev.id}
              className={`flex items-center justify-between px-5 py-3.5 ${
                i < upcomingEvents.length - 1 ? "border-b border-white/5" : ""
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{ev.emoji}</span>
                <div>
                  <div className="text-sm font-medium text-cream">{ev.title}</div>
                  <div className="font-mono text-[10px] text-muted">{formatDate(ev.date)}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="mb-1 font-mono text-xs text-cream">
                  {ev.spots_taken}/{ev.total_spots}
                </div>
                <div className="h-[3px] w-[60px] overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${ev.total_spots > 0 ? Math.min(100, (ev.spots_taken / ev.total_spots) * 100) : 0}%`,
                      background: ev.accent || "#D4A574",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
