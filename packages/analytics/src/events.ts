// Landing — discovery
export const EVENT_CARD_VIEWED = "event_card_viewed";
export const EVENT_DETAIL_OPENED = "event_detail_opened";

// Landing — gate
export const GATE_OPENED = "gate_opened";
export const CODE_VALIDATED = "code_validated";
export const CODE_FAILED = "code_failed";
export const CHATBOT_OPENED = "chatbot_opened";
export const SIGNIN_STARTED = "signin_started";
export const SIGNIN_SUCCESS = "signin_success";
export const SIGNIN_FAILED = "signin_failed";

// App — checkout funnel
export const CHECKOUT_STARTED = "checkout_started";
export const CHECKOUT_STEP_VIEWED = "checkout_step_viewed";
export const CHECKOUT_STEP_COMPLETED = "checkout_step_completed";
export const TIER_SELECTED = "tier_selected";
export const CHECKOUT_COMPLETED = "checkout_completed";
export const CHECKOUT_ABANDONED = "checkout_abandoned";
export const CHECKOUT_EXIT_REASON = "checkout_exit_reason";

// App — share
export const EVENT_SHARED = "event_shared";
export const TICKET_SHARED = "ticket_shared";
export const TICKET_CALENDAR_ADDED = "ticket_calendar_added";
export const VOUCH_CODE_SHARED = "vouch_code_shared";

// ── Funnel observability (paid-traffic conversion funnel) ─────────────
// Stable event names so PostHog funnel views stay consistent across deploys.
// Each event carries event_id + utm_source/medium/campaign/content where applicable.
export const FUNNEL_LANDING_VIEWED = "funnel_landing_viewed";
export const FUNNEL_IM_IN_CLICKED = "funnel_im_in_clicked";
export const FUNNEL_VALIDATE_CODE_SUCCESS = "funnel_validate_code_success";
export const FUNNEL_VALIDATE_CODE_FAILED = "funnel_validate_code_failed";
export const FUNNEL_APP_HANDOFF_STARTED = "funnel_app_handoff_started";
export const FUNNEL_APP_HANDOFF_COMPLETED = "funnel_app_handoff_completed";
export const FUNNEL_APP_HANDOFF_FAILED = "funnel_app_handoff_failed";
export const FUNNEL_EVENT_DETAIL_OPENED_IN_APP = "funnel_event_detail_opened_in_app";
export const FUNNEL_TIER_SELECTED_IN_APP = "funnel_tier_selected_in_app";
export const FUNNEL_CHECKOUT_OPENED = "funnel_checkout_opened";
export const FUNNEL_RAZORPAY_REDIRECTED = "funnel_razorpay_redirected";
export const FUNNEL_PURCHASE_CONFIRMED = "funnel_purchase_confirmed"; // server-side
