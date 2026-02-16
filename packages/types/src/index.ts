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

export interface User {
  id: string;
  name: string;
  handle: string;
  vibe_tag: string;
  instagram_handle?: string;
  invite_code_used: string;
  vouched_by?: string;
  entry_path: EntryPath;
  vibe_check_answers: VibeCheckAnswer[];
  badges: Badge[];
  status: UserStatus;
  has_seen_welcome: boolean;
  fcm_token?: string;
  second_chance?: boolean;
  validated_at?: string;
  validated_by?: string;
  events_attended?: number;
  created_at: string;
}

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
  price: number; // in paise (INR). 0 = free
  capacity: number;
  sold: number;
  deadline: string; // ISO date — when this tier closes
  opens_at?: string; // ISO date — when this tier becomes available
  description: string; // e.g. "for the ones who don't hesitate"
  per_person?: number; // defaults to 1. "2" for couples pass, etc.
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

export type VouchCodeStatus = "unused" | "used" | "expired";

export interface VouchCode {
  id: string;
  code: string;
  owner_id: string; // "admin" for seed codes, user_id for earned codes
  used_by_id?: string;
  status: VouchCodeStatus;
  earned_from_event?: string; // undefined for admin-created seed codes
  created_by_admin?: string; // admin user_id who created this code
  created_at: string;
  label?: string; // optional admin label for tracking batches (e.g., "Press Kit", "Founding 50")
}

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
