"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import { instrumentSerif, isTab, TAB_GROUPS, type Tab } from "@/lib/constants";

// Tab components
import { DashboardTab } from "@/components/tabs/DashboardTab";
import { EventsTab } from "@/components/tabs/EventsTab";
import { CheckInTab } from "@/components/tabs/CheckInTab";
import { ValidationTab } from "@/components/tabs/ValidationTab";
import { ContentTab } from "@/components/tabs/ContentTab";
import { ApplicationsTab } from "@/components/tabs/ApplicationsTab";
import { MembersTab } from "@/components/tabs/MembersTab";
import { ContactTab } from "@/components/tabs/ContactTab";
import { BrandsTab } from "@/components/tabs/BrandsTab";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import { BookingsTab } from "@/components/tabs/BookingsTab";
import { DiscountsTab } from "@/components/tabs/DiscountsTab";
import { LinksTab } from "@/components/tabs/LinksTab";
import { CreatorsTab } from "@/components/tabs/CreatorsTab";
import { WhatsAppTab } from "@/components/tabs/WhatsAppTab";
import { MarketingPanel } from "@/components/tabs/WhatsAppMarketingPanel";
import { ReportsTab } from "@/components/tabs/ReportsTab";
import { EventWorkspace } from "@/components/EventWorkspace";
import { TabErrorBoundary } from "@/components/TabErrorBoundary";
import { Toaster } from "@/components/Toaster";

export default function Home() {
  return (
    <AuthProvider>
      {/* useSearchParams needs a Suspense boundary during prerender */}
      <Suspense fallback={null}>
        <AdminDashboard />
      </Suspense>
    </AuthProvider>
  );
}

function AdminDashboard() {
  const { user, loading, isAdmin, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab + event workspace live in the URL so refresh, bookmarks (door phone!),
  // back button, and dashboard deep-links all work.
  const tabParam = searchParams.get("tab");
  const tab: Tab = isTab(tabParam) ? tabParam : "dashboard";
  const eventParam = searchParams.get("event");

  const setTab = useCallback(
    (t: Tab) => router.push(`/?tab=${t}`, { scroll: false }),
    [router],
  );
  const openEvent = useCallback(
    (id: string) => router.push(`/?tab=events&event=${encodeURIComponent(id)}`, { scroll: false }),
    [router],
  );

  const activeGroup = TAB_GROUPS.find((g) => g.tabs.includes(tab)) ?? TAB_GROUPS[0];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gate-black">
        <p className="font-mono text-sm text-muted">loading...</p>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

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

      {/* Group row — desktop only; phones get the bottom bar instead */}
      <nav className="hidden overflow-x-auto border-b border-white/5 px-4 sm:block sm:px-6">
        <div className="flex min-w-max gap-1">
          {TAB_GROUPS.map((g) => (
            <button
              key={g.key}
              onClick={() => setTab(g.tabs[0])}
              className={`whitespace-nowrap px-4 py-3 font-mono text-[11px] uppercase tracking-[2px] transition-colors ${
                activeGroup.key === g.key
                  ? "border-b-2 border-caramel text-cream"
                  : "text-muted hover:text-cream"
              }`}
            >
              {g.emoji} {g.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Sub-tab row — sticky chips, thumb-sized on mobile */}
      {activeGroup.tabs.length > 1 && (
        <nav className="sticky top-0 z-30 overflow-x-auto border-b border-white/5 bg-gate-black/95 px-4 backdrop-blur sm:static sm:bg-white/[0.015] sm:px-6 sm:backdrop-blur-none">
          <div className="flex min-w-max gap-1.5 py-2 sm:gap-1 sm:py-0">
            {activeGroup.tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`whitespace-nowrap rounded-full px-4 py-2.5 font-mono text-[10px] uppercase tracking-[1.5px] transition-colors sm:rounded-none sm:px-3.5 ${
                  tab === t
                    ? "bg-caramel/15 text-caramel sm:bg-transparent"
                    : "bg-white/[0.04] text-muted hover:text-cream sm:bg-transparent"
                }`}
              >
                <span className="hidden sm:inline">{tab === t ? "● " : ""}</span>{t}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Content — bottom padding clears the mobile bottom bar */}
      <main className="p-4 pb-28 sm:p-6 sm:pb-6">
        {tab === "dashboard" && <TabErrorBoundary tabName="dashboard" key="dashboard"><DashboardTab onNavigate={setTab} /></TabErrorBoundary>}
        {tab === "events" && (
          <TabErrorBoundary tabName="events" key={eventParam ? `event-${eventParam}` : "events"}>
            {eventParam
              ? <EventWorkspace eventId={eventParam} onBack={() => setTab("events")} />
              : <EventsTab onOpenEvent={openEvent} />}
          </TabErrorBoundary>
        )}
        {tab === "bookings" && <TabErrorBoundary tabName="bookings" key="bookings"><BookingsTab /></TabErrorBoundary>}
        {tab === "discounts" && <TabErrorBoundary tabName="discounts" key="discounts"><DiscountsTab /></TabErrorBoundary>}
        {tab === "links" && <TabErrorBoundary tabName="links" key="links"><LinksTab /></TabErrorBoundary>}
        {tab === "creators" && <TabErrorBoundary tabName="creators" key="creators"><CreatorsTab /></TabErrorBoundary>}
        {tab === "marketing" && <TabErrorBoundary tabName="marketing" key="marketing"><MarketingPanel /></TabErrorBoundary>}
        {tab === "check-in" && <TabErrorBoundary tabName="check-in" key="check-in"><CheckInTab /></TabErrorBoundary>}
        {tab === "validation" && <TabErrorBoundary tabName="validation" key="validation"><ValidationTab /></TabErrorBoundary>}
        {tab === "content" && <TabErrorBoundary tabName="content" key="content"><ContentTab /></TabErrorBoundary>}
        {tab === "applications" && <TabErrorBoundary tabName="applications" key="applications"><ApplicationsTab /></TabErrorBoundary>}
        {tab === "members" && <TabErrorBoundary tabName="members" key="members"><MembersTab /></TabErrorBoundary>}
        {(tab === "safety" || tab === "reports") && <TabErrorBoundary tabName="safety" key="safety"><ReportsTab /></TabErrorBoundary>}
        {tab === "contact" && <TabErrorBoundary tabName="contact" key="contact"><ContactTab /></TabErrorBoundary>}
        {tab === "brands" && <TabErrorBoundary tabName="brands" key="brands"><BrandsTab /></TabErrorBoundary>}
        {tab === "whatsapp" && <TabErrorBoundary tabName="whatsapp" key="whatsapp"><WhatsAppTab /></TabErrorBoundary>}
        {tab === "settings" && <TabErrorBoundary tabName="settings" key="settings"><SettingsTab /></TabErrorBoundary>}
      </main>

      {/* Mobile bottom nav — one thumb-reachable button per group */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-gate-black/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="grid grid-cols-6">
          {TAB_GROUPS.map((g) => (
            <button
              key={g.key}
              onClick={() => setTab(g.tabs[0])}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-1 transition-colors ${
                activeGroup.key === g.key ? "text-caramel" : "text-muted"
              }`}
            >
              <span className={`text-lg leading-none ${activeGroup.key === g.key ? "" : "opacity-60 grayscale"}`}>
                {g.emoji}
              </span>
              <span className="font-mono text-[8px] uppercase tracking-[1px]">{g.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <Toaster />
    </div>
  );
}
