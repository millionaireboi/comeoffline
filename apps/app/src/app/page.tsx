"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useTokenHandoff } from "@/hooks/useTokenHandoff";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useStage } from "@/hooks/useStage";
import { useNavigationHistory } from "@/hooks/useNavigationHistory";
import { useAppStore } from "@/store/useAppStore";
import { apiFetch } from "@/lib/api";
import type { Ticket, Event } from "@comeoffline/types";
import { TheGate } from "@/components/gates/TheGate";
import { PWAInstallPrompt } from "@/components/shared/PWAInstallPrompt";
import { AcceptanceScreen } from "@/components/gates/AcceptanceScreen";
import { EventFeed } from "@/components/events/EventFeed";
import { CountdownScreen } from "@/components/events/CountdownScreen";
import { VenueReveal } from "@/components/events/VenueReveal";
import { DayOfScreen } from "@/components/events/DayOfScreen";
import { GoDarkScreen } from "@/components/events/GoDarkScreen";
import { MemoriesScreen } from "@/components/events/MemoriesScreen";
import { ReconnectScreen } from "@/components/events/ReconnectScreen";
import { VouchScreen } from "@/components/events/VouchScreen";
import { CommunityPoll } from "@/components/events/CommunityPoll";
import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { BookingsScreen } from "@/components/bookings/BookingsScreen";
import { ProfileSetup } from "@/components/onboarding/ProfileSetup";
import { AppEducation } from "@/components/onboarding/AppEducation";
import { SignQuizOffer } from "@/components/onboarding/SignQuizOffer";
import { SignQuiz } from "@/components/onboarding/SignQuiz";
import { InAppChat } from "@/components/chat/InAppChat";
import { BottomNav } from "@/components/shared/BottomNav";
import { Toast } from "@/components/shared/Toast";
import { SignInScreen } from "@/components/gates/SignInScreen";

export default function Home() {
  const { loading, getIdToken, logout } = useAuth();
  const { triggerPrompt } = usePWAInstall();
  const { checking: tokenChecking } = useTokenHandoff();
  usePushNotifications();
  useStage(); // Auto stage transitions based on event dates + ticket/RSVP status
  useNavigationHistory(); // Browser back button / swipe-back support
  const stage = useAppStore((s) => s.stage);
  const user = useAppStore((s) => s.user);
  const [chatOpen, setChatOpen] = useState(false);
  const [quizActive, setQuizActive] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const prevStageRef = useRef(stage);
  const ticketRestorationDone = useRef(false);
  const prevStageForPrompt = useRef<string | null>(null);

  // Reset sign-in view when leaving the gate stage (e.g. after successful login)
  useEffect(() => {
    if (stage !== "gate") setShowSignIn(false);
  }, [stage]);

  // Scroll-to-top + fade transition on stage change
  useEffect(() => {
    if (prevStageRef.current !== stage) {
      setTransitioning(true);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      // Short fade-in after stage switch
      const raf = requestAnimationFrame(() => {
        setTransitioning(false);
      });
      prevStageRef.current = stage;
      return () => cancelAnimationFrame(raf);
    }
  }, [stage]);

  // Restore active ticket on startup (survives page reloads, app restarts)
  const restoreActiveTicket = useCallback(async (signal?: { cancelled: boolean }) => {
    try {
      const token = await getIdToken();
      if (!token || signal?.cancelled) return;

      // /api/tickets/mine returns enriched tickets sorted by purchased_at DESC
      const ticketsRes = await apiFetch<{ success: boolean; data: Array<Ticket & { event_date?: string }> }>("/api/tickets/mine", { token });
      if (!ticketsRes.data?.length || signal?.cancelled) return;

      // Find most recent confirmed/checked-in ticket for an upcoming event
      const now = new Date();
      const activeStatuses = new Set(["confirmed", "checked_in", "partially_checked_in"]);
      const activeTicket = ticketsRes.data.find((t) => {
        if (!activeStatuses.has(t.status)) return false;
        if (t.event_date) {
          const eventDate = new Date(t.event_date);
          const dayAfter = new Date(eventDate);
          dayAfter.setDate(dayAfter.getDate() + 2); // grace period
          return now < dayAfter;
        }
        return true; // no date info — assume active
      });

      if (!activeTicket || signal?.cancelled) return;

      const eventRes = await apiFetch<{ success: boolean; data: Event }>(
        `/api/events/${activeTicket.event_id}`,
        { token },
      );

      if (signal?.cancelled) return;

      // Only set ticket if we also got the event — they must be paired
      if (eventRes.data) {
        const { setActiveTicket, setCurrentEvent } = useAppStore.getState();
        setCurrentEvent(eventRes.data);
        setActiveTicket(activeTicket);
        // useStage will auto-derive the correct stage (countdown/reveal/dayof/etc.)
      }
    } catch (err) {
      console.error("[ticket-restore] Failed to restore active ticket:", err);
    }
  }, [getIdToken]);

  // Handle return from Razorpay payment
  useEffect(() => {
    if (typeof window === "undefined" || loading || tokenChecking) return;
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    const rzpStatus = params.get("razorpay_status");
    const ticketId = params.get("ticket_id");

    if (!rzpStatus || !ticketId) return;

    // Mark as handled so the startup restoration doesn't also run
    ticketRestorationDone.current = true;

    // Clean URL only after we've confirmed user is available
    window.history.replaceState({ stage: useAppStore.getState().stage }, "", "/");

    setPaymentProcessing(true);
    const signal = { cancelled: false };
    let attempts = 0;
    const maxAttempts = 20;
    let pendingTimeout: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      if (signal.cancelled) return;
      attempts++;

      try {
        const token = await getIdToken();
        if (!token || signal.cancelled) {
          setPaymentProcessing(false);
          return;
        }

        const res = await apiFetch<{ success: boolean; data: { id: string; status: string; event_id: string } }>(
          `/api/tickets/${ticketId}/status`,
          { token },
        );

        if (signal.cancelled) return;

        if (res.data?.status === "confirmed") {
          const [ticketRes, eventRes] = await Promise.all([
            apiFetch<{ success: boolean; data: Ticket[] }>("/api/tickets/mine", { token }),
            apiFetch<{ success: boolean; data: Event }>(`/api/events/${res.data.event_id}`, { token }),
          ]);

          if (!signal.cancelled) {
            const ticket = ticketRes.data?.find((t) => t.id === ticketId);
            if (ticket && eventRes.data) {
              const { setActiveTicket, setCurrentEvent, setStage } = useAppStore.getState();
              setCurrentEvent(eventRes.data);
              setActiveTicket(ticket);
              setStage("countdown");
            }
            setPaymentProcessing(false);
          }
          return;
        }

        if (attempts < maxAttempts) {
          pendingTimeout = setTimeout(poll, 3000);
        } else {
          // Polling exhausted — try restoring via tickets/mine as fallback
          await restoreActiveTicket(signal);
          if (!signal.cancelled) setPaymentProcessing(false);
        }
      } catch (err) {
        console.error("[payment-callback] Poll error:", err);
        if (signal.cancelled) return;
        if (attempts < maxAttempts) {
          pendingTimeout = setTimeout(poll, 3000);
        } else {
          await restoreActiveTicket(signal);
          if (!signal.cancelled) setPaymentProcessing(false);
        }
      }
    };

    poll();

    return () => {
      signal.cancelled = true;
      if (pendingTimeout) clearTimeout(pendingTimeout);
      setPaymentProcessing(false);
    };
  }, [loading, tokenChecking, user, getIdToken, restoreActiveTicket]);

  // Restore active ticket on app startup (when no payment callback is in progress)
  useEffect(() => {
    if (loading || tokenChecking || !user || ticketRestorationDone.current) return;

    // Skip if Razorpay callback params are present (the payment callback handles that)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("razorpay_status") && params.get("ticket_id")) return;
    }

    // Skip if we already have an active ticket
    const { activeTicket } = useAppStore.getState();
    if (activeTicket) {
      ticketRestorationDone.current = true;
      return;
    }

    ticketRestorationDone.current = true;
    const signal = { cancelled: false };
    restoreActiveTicket(signal);
    return () => { signal.cancelled = true; };
  }, [loading, tokenChecking, user, restoreActiveTicket]);

  // Trigger PWA install prompt after booking (when user transitions to countdown)
  useEffect(() => {
    if (
      stage === "countdown" &&
      prevStageForPrompt.current &&
      prevStageForPrompt.current !== "countdown"
    ) {
      triggerPrompt();
    }
    prevStageForPrompt.current = stage;
  }, [stage, triggerPrompt]);

  // Payment processing screen — show while polling for webhook confirmation
  if (paymentProcessing) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-8 text-center">
        <div className="mb-6 h-10 w-10 animate-spin rounded-full border-[3px] border-sand border-t-caramel" />
        <h2 className="font-serif text-2xl text-near-black" style={{ letterSpacing: "-0.5px" }}>
          verifying payment
        </h2>
        <p className="mt-3 max-w-[260px] font-sans text-[14px] leading-relaxed text-warm-brown">
          hang tight — we&apos;re confirming your ticket with the payment provider.
        </p>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[3px] text-muted/40">
          this usually takes a few seconds
        </p>
      </main>
    );
  }

  // Loading state (auth loading or token handoff in progress)
  if (loading || tokenChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gate-black">
        <div className="text-center">
          <h1 className="font-serif text-4xl tracking-tight text-cream" style={{ letterSpacing: "-1px" }}>
            come offline
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[4px] text-muted/40">
            loading...
          </p>
        </div>
      </main>
    );
  }

  // Inactive user — tasteful exit screen with auto-logout
  if (user && user.status === "inactive") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gate-black px-8 text-center">
        <span className="mb-6 text-5xl">&#x1F33F;</span>
        <h1 className="font-serif text-3xl tracking-tight text-cream" style={{ letterSpacing: "-1px" }}>
          your chapter has ended
        </h1>
        <p className="mt-4 max-w-[280px] font-sans text-[15px] leading-relaxed text-muted">
          thanks for being part of the community. sometimes the vibe shifts, and that&apos;s okay.
        </p>
        <button
          onClick={logout}
          className="mt-8 rounded-full border border-muted/20 px-6 py-2.5 font-mono text-[11px] text-muted transition-colors hover:text-cream"
        >
          sign out
        </button>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[3px] text-muted/30">
          come offline
        </p>
      </main>
    );
  }

  // Show bottom nav on authenticated stages
  const showNav = user && !["gate", "accepted", "install", "profile_setup", "app_education", "sign_quiz"].includes(stage);

  // Route based on stage
  let screen: React.ReactNode;
  switch (stage) {
    case "gate":
      screen = showSignIn
        ? <SignInScreen onBack={() => setShowSignIn(false)} />
        : <TheGate onSignIn={() => setShowSignIn(true)} />;
      break;
    case "accepted":
      screen = <AcceptanceScreen />;
      break;
    case "profile_setup":
      screen = <ProfileSetup />;
      break;
    case "app_education":
      screen = <AppEducation />;
      break;
    case "sign_quiz":
      screen = quizActive
        ? <SignQuiz onComplete={() => { setQuizActive(false); }} mode="onboarding" />
        : <SignQuizOffer onStartQuiz={() => setQuizActive(true)} />;
      break;
    case "feed":
      screen = <EventFeed />;
      break;
    case "countdown":
      screen = <CountdownScreen />;
      break;
    case "reveal":
      screen = <VenueReveal />;
      break;
    case "dayof":
      screen = <DayOfScreen />;
      break;
    case "godark":
      screen = <GoDarkScreen />;
      break;
    case "memories":
      screen = <MemoriesScreen />;
      break;
    case "reconnect":
      screen = <ReconnectScreen />;
      break;
    case "vouch":
      screen = <VouchScreen />;
      break;
    case "poll":
      screen = <CommunityPoll />;
      break;
    case "profile":
      screen = <ProfileScreen />;
      break;
    case "bookings":
      screen = <BookingsScreen />;
      break;
    default:
      screen = <TheGate />;
  }

  return (
    <>
      <div
        key={stage}
        className="animate-screenIn"
        style={{ opacity: transitioning ? 0 : undefined }}
      >
        {screen}
      </div>
      {showNav && <BottomNav onChatOpen={() => setChatOpen(true)} />}
      {chatOpen && <InAppChat onClose={() => setChatOpen(false)} />}
      <PWAInstallPrompt />
      <Toast />
    </>
  );
}
