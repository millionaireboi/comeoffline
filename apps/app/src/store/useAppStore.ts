import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Event, RSVP, Ticket, WaitlistEntry, OnboardingSource } from "@comeoffline/types";

export type AppStage =
  | "install"
  | "gate"
  | "accepted"
  | "profile_setup"
  | "app_education"
  | "sign_quiz"
  | "feed"
  | "countdown"
  | "reveal"
  | "dayof"
  | "godark"
  | "memories"
  | "reconnect"
  | "profile"
  | "poll"
  | "bookings";

interface AppState {
  // Auth
  user: User | null;
  setUser: (user: User | null) => void;

  // Navigation
  stage: AppStage;
  previousStage: AppStage | null;
  setStage: (stage: AppStage) => void;

  // Tracks where user explicitly navigated from (survives auto-transitions)
  navigationOrigin: AppStage | null;
  setNavigationOrigin: (origin: AppStage | null) => void;

  // Onboarding source (tracks which entry path the user came from)
  onboardingSource: OnboardingSource | null;
  setOnboardingSource: (source: OnboardingSource | null) => void;

  // Active event context
  currentEvent: Event | null;
  setCurrentEvent: (event: Event | null) => void;

  // Whether the event detail sheet is currently open. When true, the bottom nav
  // is hidden so the conversion flow gets the full viewport.
  eventDetailOpen: boolean;
  setEventDetailOpen: (open: boolean) => void;

  // Active RSVP (legacy, for free events)
  activeRsvp: RSVP | null;
  setActiveRsvp: (rsvp: RSVP | null) => void;

  // Active Ticket (for ticketed events)
  activeTicket: Ticket | null;
  setActiveTicket: (ticket: Ticket | null) => void;

  // Events feed cache (persists across stage transitions)
  events: Event[];
  setEvents: (events: Event[]) => void;

  // Active Waitlist Entry (for announced events)
  activeWaitlistEntry: WaitlistEntry | null;
  setActiveWaitlistEntry: (entry: WaitlistEntry | null) => void;

  // Profile completion mode (triggered from "finish it" nudge)
  profileCompleteMode: boolean;
  setProfileCompleteMode: (mode: boolean) => void;

  // Full-profile wizard mode (triggered before ticket purchase when only core profile is done)
  fullProfileMode: boolean;
  setFullProfileMode: (mode: boolean) => void;

  // Event the user was about to buy when the community-safety dialog interrupted them.
  // EventFeed auto-reopens the detail sheet for this event after full-profile submit.
  // Also used as a deep-link target — landing-page handoff sets this so the user lands
  // on the right event detail instead of the home feed.
  pendingPurchaseEventId: string | null;
  setPendingPurchaseEventId: (id: string | null) => void;

  // When the deep-link intent was captured (ms epoch). Used to expire stale
  // intent on rehydrate so a week-old ad click doesn't reopen a dead event.
  pendingIntentAt: number | null;

  // Tier preselected from a landing-page deep-link (?tier=<id>). Consumed by EventDetail
  // so the user doesn't have to pick the tier again inside the app.
  pendingDeepLinkTierId: string | null;
  setPendingDeepLinkTierId: (id: string | null) => void;

  // Acquisition attribution from the handoff URL (?source=poster&utm_*). Persisted so it
  // survives sign-in and the Razorpay redirect, then stamped on the ticket at purchase —
  // this is what ties a sale back to a specific poster/campaign.
  attribution: Record<string, string> | null;
  setAttribution: (attribution: Record<string, string> | null) => void;
  attributionAt: number | null;

  // Shows the "you're in! complete your profile" dialog after a successful ticket purchase.
  // Renders globally from page.tsx, regardless of which stage is active.
  showCompletionDialog: boolean;
  setShowCompletionDialog: (show: boolean) => void;

  // Toast notifications
  toast: { message: string; type: "error" | "success" | "info" } | null;
  showToast: (message: string, type?: "error" | "success" | "info") => void;
  clearToast: () => void;
}

let toastTimeout: ReturnType<typeof setTimeout> | null = null;

// Deep-link intent older than this is dropped on rehydrate
const INTENT_TTL_MS = 24 * 60 * 60 * 1000;
// Creator/campaign attribution outlives purchase intent: a creator's link
// "remembers" the visitor for 30 days (locked with founder — last click wins,
// a typed discount code still beats the link server-side).
const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
  user: null,
  setUser: (user) => set({ user }),

  stage: "gate",
  previousStage: null,
  setStage: (stage) => set((state) => ({ stage, previousStage: state.stage })),

  navigationOrigin: null,
  setNavigationOrigin: (origin) => set({ navigationOrigin: origin }),

  onboardingSource: null,
  setOnboardingSource: (source) => set({ onboardingSource: source }),

  currentEvent: null,
  setCurrentEvent: (event) => set({ currentEvent: event }),

  eventDetailOpen: false,
  setEventDetailOpen: (open) => set({ eventDetailOpen: open }),

  activeRsvp: null,
  setActiveRsvp: (rsvp) => set({ activeRsvp: rsvp }),

  activeTicket: null,
  setActiveTicket: (ticket) => set({ activeTicket: ticket }),

  events: [],
  setEvents: (events) => set({ events }),

  activeWaitlistEntry: null,
  setActiveWaitlistEntry: (entry) => set({ activeWaitlistEntry: entry }),

  profileCompleteMode: false,
  setProfileCompleteMode: (mode) => set({ profileCompleteMode: mode }),

  fullProfileMode: false,
  setFullProfileMode: (mode) => set({ fullProfileMode: mode }),

  pendingPurchaseEventId: null,
  setPendingPurchaseEventId: (id) => set({ pendingPurchaseEventId: id, pendingIntentAt: id ? Date.now() : null }),

  pendingIntentAt: null,

  pendingDeepLinkTierId: null,
  setPendingDeepLinkTierId: (id) => set({ pendingDeepLinkTierId: id }),

  attribution: null,
  setAttribution: (attribution) => set({ attribution, attributionAt: attribution ? Date.now() : null }),
  attributionAt: null,

  showCompletionDialog: false,
  setShowCompletionDialog: (show) => set({ showCompletionDialog: show }),

  toast: null,
  showToast: (message, type = "error") => {
    if (toastTimeout) clearTimeout(toastTimeout);
    set({ toast: { message, type } });
    toastTimeout = setTimeout(() => { set({ toast: null }); toastTimeout = null; }, 3500);
  },
  clearToast: () => {
    if (toastTimeout) { clearTimeout(toastTimeout); toastTimeout = null; }
    set({ toast: null });
  },
    }),
    {
      name: "co-app-intent",
      // Persist ONLY the deep-link purchase intent. Everything else is either
      // re-derived from auth (user, stage) or re-fetched (events, tickets).
      // This is what lets the intended event survive the hard redirect to
      // Razorpay and refreshes mid-onboarding.
      partialize: (state) => ({
        pendingPurchaseEventId: state.pendingPurchaseEventId,
        pendingDeepLinkTierId: state.pendingDeepLinkTierId,
        pendingIntentAt: state.pendingIntentAt,
        attribution: state.attribution,
        attributionAt: state.attributionAt,
      }),
      onRehydrateStorage: () => (state) => {
        // Drop stale intent — a day-old ad click shouldn't force-open an event
        if (state?.pendingPurchaseEventId && (!state.pendingIntentAt || Date.now() - state.pendingIntentAt > INTENT_TTL_MS)) {
          state.setPendingPurchaseEventId(null);
          state.setPendingDeepLinkTierId(null);
        }
        // Attribution gets a longer window — a creator's link keeps credit for
        // 30 days ("i'll book on payday" is a real purchase path at ₹700+)
        if (state?.attribution && (!state.attributionAt || Date.now() - state.attributionAt > ATTRIBUTION_TTL_MS)) {
          state.setAttribution(null);
        }
      },
    },
  ),
);
