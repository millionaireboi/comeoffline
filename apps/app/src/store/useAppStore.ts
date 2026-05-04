import { create } from "zustand";
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
  | "vouch"
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
  pendingPurchaseEventId: string | null;
  setPendingPurchaseEventId: (id: string | null) => void;

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

export const useAppStore = create<AppState>((set) => ({
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
  setPendingPurchaseEventId: (id) => set({ pendingPurchaseEventId: id }),

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
}));
