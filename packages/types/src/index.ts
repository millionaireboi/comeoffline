export * from "./signs";

// ── User ──────────────────────────────────────────

export interface VibeCheckAnswer {
  question: string;
  answer: string;
}

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  earned_at: string;
  event_id?: string;
}

export type EntryPath = "invite" | "vouch" | "chatbot";
export type UserStatus = "active" | "provisional" | "inactive";
export type OnboardingSource = "landing_code" | "landing_chatbot" | "direct_pwa";

export interface User {
  id: string;
  name: string;
  handle: string;
  vibe_tag: string;
  email?: string;
  instagram_handle?: string;
  invite_code_used: string;
  vouched_by?: string;
  entry_path: EntryPath;
  vibe_check_answers: VibeCheckAnswer[];
  badges: Badge[];
  status: UserStatus;
  has_seen_welcome: boolean;
  avatar_url?: string;
  avatar_type?: "uploaded" | "illustrated" | "gradient";
  area?: string;
  age_range?: "21-24" | "25-28" | "29-32" | "33+";
  gender?: "male" | "female" | "non-binary" | "prefer not to say";
  hot_take?: string;
  bio?: string;
  interests?: string[];
  date_of_birth?: string;
  show_age?: boolean;
  drink_of_choice?: string;
  community_intent?: string;
  referral_source?: string;
  has_completed_profile?: boolean;
  has_completed_onboarding?: boolean;
  sign?: string;
  sign_scores?: Record<string, number>;
  sign_label?: string;
  sign_emoji?: string;
  sign_color?: string;
  quiz_completed_at?: string;
  onboarding_source?: OnboardingSource;
  fcm_token?: string;
  second_chance?: boolean;
  validated_at?: string;
  validated_by?: string;
  events_attended?: number;
  pin_hash?: string;
  pin_set_at?: string;
  created_at: string;
}

// ── Interests ────────────────────────────────────

export const CURATED_INTERESTS = [
  "live music", "house parties", "hiking", "coffee",
  "street food", "craft beer", "board games", "gaming",
  "fitness", "yoga", "reading", "writing",
  "photography", "filmmaking", "startups", "design",
  "travel", "thrifting", "anime", "comedy",
  "cooking", "dancing", "volunteering", "pets",
  "astrology", "sustainability",
] as const;

export type Interest = (typeof CURATED_INTERESTS)[number];

// ── Event ─────────────────────────────────────────

export interface Zone {
  icon: string;
  name: string;
  desc: string;
}

export interface PickupPoint {
  name: string;
  time: string;
  capacity: number;
  lat?: number;
  lng?: number;
}

export type EventStatus = "draft" | "upcoming" | "sold_out" | "live" | "completed";

export interface TicketTier {
  id: string; // unique tier ID within event
  name: string; // flexible: "early_bird", "regular", "last_call", "vip", "couples", etc.
  label: string; // display name: "Early Bird", "Regular", "VIP Table", "Couples Pass"
  price: number; // in rupees (INR). 0 = free
  capacity: number;
  sold: number;
  deadline: string; // ISO date — when this tier closes
  opens_at?: string; // ISO date — when this tier becomes available
  description: string; // e.g. "for the ones who don't hesitate"
  per_person?: number; // defaults to 1. "2" for couples pass, etc.
  sort_order?: number; // explicit ordering (0, 1, 2, ...)
  auto_activate?: boolean; // auto-open when previous tier sells out/expires
}

export interface TimeSlot {
  id: string;
  label: string; // e.g. "4:00 PM – 5:00 PM"
  start_time: string;
  end_time: string;
  capacity: number;
  booked: number;
}

export interface TicketingConfig {
  enabled: boolean; // false = free RSVP, true = ticketed
  tiers: TicketTier[];
  time_slots_enabled: boolean; // if true, user picks a time slot during purchase
  time_slots?: TimeSlot[];
  max_per_user: number; // usually 1, but could be 2 for +1 events
  refund_policy?: string; // shown to user at checkout
}

// ── Checkout Add-ons ──────────────────────────────

/** Seating config for add-ons — custom mode only (spots/tables) */
export interface AddonSeatingConfig {
  enabled: boolean;
  spots: Spot[];
  floor_plan_url?: string;
  allow_choice: boolean;
}

export interface CheckoutAddOn {
  id: string;
  name: string; // "Stay Booking", "Food Package", "Merch Bundle"
  description: string;
  image_url?: string;
  price: number; // in rupees (INR)
  max_quantity: number; // max per order
  available: number; // remaining inventory
  required: boolean; // must select at least one
  seating?: AddonSeatingConfig; // optional per-addon seating (custom spots/tables)
}

export interface CheckoutStep {
  id: string;
  title: string; // "Choose Your Stay", "Add Food Package"
  description?: string;
  type: "addon_select" | "info" | "pickup_select" | "seat_select";
  add_ons?: CheckoutAddOn[]; // for addon_select type
  image_url?: string;
}

export interface CheckoutConfig {
  steps: CheckoutStep[];
  enabled: boolean;
}

export interface PostBookingSection {
  type: "what_to_bring" | "what_to_expect" | "schedule" | "custom";
  title: string;
  items: string[]; // bullet points or schedule items
  icon?: string; // emoji
}

export interface PostBookingContent {
  sections: PostBookingSection[];
  custom_message?: string; // personal note from organizer
  show_countdown: boolean;
  show_venue_progress: boolean;
  show_daily_quote: boolean;
}

// ── Seating ──────────────────────────────────────

export type SeatingMode = "none" | "sections" | "seats" | "mixed" | "custom";

/** Section-based seating — capacity pools without individual seats */
export interface SeatingSection {
  id: string;
  name: string; // "VIP Lounge", "General", "Front Row"
  emoji?: string;
  description?: string;
  capacity: number;
  booked: number;
  price_override?: number; // if set, overrides tier price for this section
  color?: string; // hex color for UI
}

/** Individual seat within a row */
export interface Seat {
  id: string; // "A1", "B12", etc.
  row: string; // "A", "B", etc.
  number: number; // 1, 2, 3...
  status: "available" | "held" | "booked";
  held_by?: string; // user_id when held/booked
  held_until?: string; // ISO timestamp — auto-release hold after this time
  section_id?: string; // link to parent section if mixed mode
  price_override?: number;
}

/** Row definition for individual seating */
export interface SeatRow {
  id: string; // "A", "B", "C"...
  label: string; // display label
  seats_count: number;
  section_id?: string; // optional parent section
}

/** Individual seat within a spot/table for custom seating */
export interface SpotSeat {
  id: string; // e.g. "spot_123_seat_1"
  label: string; // "Seat 1", "1", etc.
  status: "available" | "held" | "booked";
  held_by?: string; // user_id when held/booked
  held_until?: string; // ISO timestamp — auto-release hold after this time
  angle?: number; // degrees around table center (0=top, clockwise) for circular placement
}

/** Freeform named spot for custom seating layouts */
export interface Spot {
  id: string; // e.g. "spot_1708000000"
  name: string; // "Bean Bag Corner", "Pod Table A", "Table 1"
  emoji?: string; // "🛋️", "🪑"
  capacity: number; // how many people fit (1 for single, 4 for table)
  booked: number; // current booking count
  section_id?: string; // optional link to a SeatingSection
  price_override?: number;
  description?: string; // "Cozy corner with floor cushions"
  x?: number; // percentage position on floor plan (0-100)
  y?: number; // percentage position on floor plan (0-100)
  shape?: "circle" | "rectangle" | "square"; // table shape for visual rendering
  seats?: SpotSeat[]; // individual seats — if present, users pick a seat; if absent, legacy capacity counter
  spot_type?: "table" | "fixture" | "zone"; // table=bookable, fixture=landmark (DJ booth, bar), zone=open area
}

export interface SeatingConfig {
  mode: SeatingMode;
  sections: SeatingSection[];
  rows: SeatRow[];
  seats: Seat[]; // populated from rows or manually set
  spots?: Spot[]; // for "custom" mode — freeform named spots
  floor_plan_url?: string; // uploaded floor plan image
  allow_choice: boolean; // if false, seats auto-assigned
}

export interface Event {
  id: string;
  title: string;
  tagline: string;
  description: string;
  date: string;
  time: string;
  total_spots: number;
  spots_taken: number;
  accent: string;
  accent_dark: string;
  emoji: string;
  tag: string;
  zones: Zone[];
  dress_code: string;
  includes: string[];
  venue_name?: string;
  venue_area?: string;
  venue_address?: string;
  venue_reveal_date: string;
  pickup_points: PickupPoint[];
  status: EventStatus;
  ticketing?: TicketingConfig;
  is_free?: boolean; // shorthand: true if no ticketing or all tiers are price 0
  post_booking?: PostBookingContent;
  checkout?: CheckoutConfig;
  seating?: SeatingConfig;
}

// ── RSVP ──────────────────────────────────────────

export type RSVPStatus = "confirmed" | "cancelled" | "attended" | "no_show";

export interface RSVP {
  id: string;
  user_id: string;
  event_id: string;
  pickup_point: string;
  status: RSVPStatus;
  rsvp_at: string;
}

// ── Ticket ────────────────────────────────────────

export type TicketStatus =
  | "pending_payment"
  | "confirmed"
  | "cancelled"
  | "checked_in"
  | "no_show";

export interface TicketAddOn {
  addon_id: string;
  name: string;
  quantity: number;
  price: number;
  spot_id?: string; // for add-on seating — e.g. "spot_123"
  spot_name?: string; // denormalized — e.g. "Table 3"
  spot_seat_id?: string; // individual seat within spot
  spot_seat_label?: string; // denormalized — e.g. "Seat 2"
}

export interface Ticket {
  id: string;
  user_id: string;
  event_id: string;
  tier_id: string; // references TicketTier.id
  tier_name: string; // denormalized for display
  price: number;
  quantity: number; // usually 1, but could be 2 for couples pass
  status: TicketStatus;
  qr_code: string;
  pickup_point: string;
  time_slot?: string; // references TimeSlot.id if time slots enabled
  add_ons?: TicketAddOn[] | null;
  seat_id?: string; // e.g. "A5" — individual seat assignment
  section_id?: string; // e.g. "vip" — section-based assignment
  section_name?: string; // denormalized for display
  spot_id?: string; // for custom seating — e.g. "spot_123"
  spot_name?: string; // denormalized — e.g. "Pod Table A"
  spot_seat_id?: string; // individual seat within spot — e.g. "spot_123_seat_1"
  spot_seat_label?: string; // denormalized — e.g. "Seat 3"
  payment_link_id?: string; // Razorpay payment link ID
  payment_url?: string; // Razorpay payment URL for redirect
  purchased_at: string;
  checked_in_at?: string;
}

// ── Handoff Token ────────────────────────────────

export interface HandoffToken {
  token: string;
  user_id: string;
  source: "landing" | "chatbot";
  user_status: UserStatus;
  expires_at: string;
  used: boolean;
}

// ── Connection ────────────────────────────────────

export interface Connection {
  id: string;
  event_id: string;
  from_user_id: string;
  to_user_id: string;
  mutual: boolean;
  window_expires: string;
}

// ── VouchCode ─────────────────────────────────────

export type VouchCodeStatus = "active" | "paused" | "expired" | "depleted";
export type VouchCodeType = "single" | "multi" | "unlimited";
export type DiscoverySource = "direct" | "instagram" | "twitter" | "friend" | "event" | "other";

export interface VouchCodeUsage {
  user_id: string;
  user_name?: string;
  used_at: string;
  source?: DiscoverySource;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export interface VouchCodeRules {
  max_uses: number | null; // null = unlimited
  expires_at?: string; // ISO date, optional expiry
  valid_from?: string; // ISO date, not usable before this
  allowed_sources?: DiscoverySource[]; // restrict to specific discovery sources
}

export interface VouchCode {
  id: string;
  code: string;
  owner_id: string; // "admin" for seed/promo codes, user_id for earned codes
  type: VouchCodeType; // single, multi, or unlimited
  status: VouchCodeStatus;
  rules: VouchCodeRules;
  uses: number; // current usage count
  used_by: VouchCodeUsage[]; // usage log — who used it and when
  earned_from_event?: string;
  created_by_admin?: string;
  created_at: string;
  label?: string; // batch label (e.g., "Press Kit", "Founding 50")
  description?: string; // internal note for admins
}

// Legacy compat — single-use code used_by_id (first user)
// Access via: code.used_by[0]?.user_id

// ── Application ───────────────────────────────────

export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface Application {
  id: string;
  user_id: string;
  name: string;
  answers: VibeCheckAnswer[];
  status: ApplicationStatus;
  reviewed_by?: string;
  submitted_at: string;
}

// ── Memories ──────────────────────────────────────

export interface Polaroid {
  id: string;
  url: string;
  caption: string;
  who: string;
  color: string;
  rotation: number;
}

export interface OverheardQuote {
  id: string;
  quote: string;
  context: string;
}

export interface EventStats {
  attended: number;
  phones: number;
  drinks: number;
  hours: string;
}

export interface Memories {
  polaroids: Polaroid[];
  quotes: OverheardQuote[];
  stats: EventStats;
}

// ── Community Poll ────────────────────────────────

export interface CommunityPollVote {
  voter_id: string;
  subject_id: string;
  vibed: boolean;
}

export interface CommunityPoll {
  id: string;
  event_id: string;
  votes: CommunityPollVote[];
  created_at: string;
  closes_at: string;
}

// ── Validation ───────────────────────────────────

export interface ValidationSignals {
  reconnect_count: number;
  poll_score: number; // 0-100 percentage
  check_in_time?: string;
  admin_notes?: string[];
}

export type ValidationDecision = "approved" | "another_chance" | "revoked";

export interface ValidationReview {
  id: string;
  user_id: string;
  event_id: string;
  decision: ValidationDecision;
  signals: ValidationSignals;
  reviewed_by: string;
  reviewed_at: string;
}

// ── Admin Note ───────────────────────────────────

export interface AdminNote {
  id: string;
  user_id: string;
  event_id: string;
  note: string;
  created_by: string;
  created_at: string;
}

// ── Admin ─────────────────────────────────────────

export type AdminRole = "super_admin" | "event_manager" | "community_manager";

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  totp_secret?: string;
}

// ── Settings ──────────────────────────────────────

export interface ChatbotSettings {
  system_prompt: string;
}

export interface VouchSettings {
  codes_first: number;
  codes_repeat: number;
  reconnect_hours: number;
  noshow_penalty: "no_vouch" | "warning" | "suspension";
}

export interface NotificationTemplate {
  trigger: string;
  message: string;
  timing: string;
}

export type NotificationAudience = "all" | "event_attendees" | "active" | "provisional";
export type NotificationStatus = "draft" | "scheduled" | "sent" | "failed";

export interface PushNotification {
  id: string;
  title: string;
  message: string;
  audience: NotificationAudience;
  event_id?: string;
  scheduled_at?: string;
  sent_at?: string;
  status: NotificationStatus;
  created_by: string;
  created_at: string;
}

// ── Contact Submission ──────────────────────────────

export type ContactSubmissionStatus = "unread" | "read" | "replied";

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  message: string;
  status: ContactSubmissionStatus;
  submitted_at: string;
  read_by?: string;
  read_at?: string;
}

// ── Brand Inquiry ───────────────────────────────────

export type BrandInquiryStatus = "new" | "contacted" | "in_progress" | "closed";

export interface BrandInquiry {
  id: string;
  name: string;
  email: string;
  brand: string;
  role: string;
  interest: string;
  status: BrandInquiryStatus;
  submitted_at: string;
  responded_by?: string;
  responded_at?: string;
  notes?: string;
}

// ── API ───────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
