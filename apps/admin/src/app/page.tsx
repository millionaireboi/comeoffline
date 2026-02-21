"use client";

import { useState } from "react";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import { instrumentSerif, type Tab } from "@/lib/constants";

// Tab components
import { DashboardTab } from "@/components/tabs/DashboardTab";
import { EventsTab } from "@/components/tabs/EventsTab";
import { CheckInTab } from "@/components/tabs/CheckInTab";
import { ValidationTab } from "@/components/tabs/ValidationTab";
import { ContentTab } from "@/components/tabs/ContentTab";
import { ApplicationsTab } from "@/components/tabs/ApplicationsTab";
import { MembersTab } from "@/components/tabs/MembersTab";
import { InviteCodesTab } from "@/components/tabs/InviteCodesTab";
import { ContactTab } from "@/components/tabs/ContactTab";
import { BrandsTab } from "@/components/tabs/BrandsTab";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import { BookingsTab } from "@/components/tabs/BookingsTab";
import { LoginScreen } from "@/components/tabs/LoginScreen";
import { TabErrorBoundary } from "@/components/TabErrorBoundary";

const TABS: Tab[] = [
  "dashboard", "events", "bookings", "check-in", "validation", "content",
  "applications", "members", "invite-codes", "contact", "brands", "settings",
];

export default function Home() {
  return (
    <AuthProvider>
      <AdminDashboard />
    </AuthProvider>
  );
}

function AdminDashboard() {
  const { user, loading, isAdmin, login, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");

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

      {/* Tabs */}
      <nav className="overflow-x-auto border-b border-white/5 px-4 sm:px-6">
        <div className="flex gap-1 min-w-max">
          {TABS.map((t) => (
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
        {tab === "dashboard" && <TabErrorBoundary tabName="dashboard" key="dashboard"><DashboardTab /></TabErrorBoundary>}
        {tab === "events" && <TabErrorBoundary tabName="events" key="events"><EventsTab /></TabErrorBoundary>}
        {tab === "bookings" && <TabErrorBoundary tabName="bookings" key="bookings"><BookingsTab /></TabErrorBoundary>}
        {tab === "check-in" && <TabErrorBoundary tabName="check-in" key="check-in"><CheckInTab /></TabErrorBoundary>}
        {tab === "validation" && <TabErrorBoundary tabName="validation" key="validation"><ValidationTab /></TabErrorBoundary>}
        {tab === "content" && <TabErrorBoundary tabName="content" key="content"><ContentTab /></TabErrorBoundary>}
        {tab === "applications" && <TabErrorBoundary tabName="applications" key="applications"><ApplicationsTab /></TabErrorBoundary>}
        {tab === "members" && <TabErrorBoundary tabName="members" key="members"><MembersTab /></TabErrorBoundary>}
        {tab === "invite-codes" && <TabErrorBoundary tabName="invite-codes" key="invite-codes"><InviteCodesTab /></TabErrorBoundary>}
        {tab === "contact" && <TabErrorBoundary tabName="contact" key="contact"><ContactTab /></TabErrorBoundary>}
        {tab === "brands" && <TabErrorBoundary tabName="brands" key="brands"><BrandsTab /></TabErrorBoundary>}
        {tab === "settings" && <TabErrorBoundary tabName="settings" key="settings"><SettingsTab /></TabErrorBoundary>}
      </main>
    </div>
  );
}
