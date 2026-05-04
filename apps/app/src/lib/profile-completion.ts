import type { User } from "@comeoffline/types";

/**
 * Returns true if the user has finished the full-profile fields needed for event prep
 * (area assignment, post-event reconnect, account security, etc.).
 *
 * A user counts as full-complete if any of:
 *  - the explicit flag is set (current ProfileSetup full-mode submit)
 *  - they've already attended an event (grandfathered in)
 *  - all the deferred fields exist (legacy 12-step wizard backfill)
 */
export function isFullProfileComplete(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.has_completed_full_profile === true) return true;
  if ((user.events_attended ?? 0) > 0) return true;
  return (
    !!user.phone_verified_at &&
    !!user.area &&
    !!user.community_intent &&
    !!user.pin_hash
  );
}
