import type { User } from "@comeoffline/types";

export function ageFromDob(dob: string): number | null {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

/** What the booking flows still need to collect before this user can book.
 * Slim onboarding means accounts may only have a phone number; age-gated
 * events (min_age) additionally need a DOB on file. */
export function identityNeeds(user: User | null | undefined, minAge?: number) {
  const hasRealDob = !!user?.date_of_birth && user.date_of_birth !== "0000-00-00";
  const needsName = !user?.name?.trim();
  const needsDob = !!minAge && !hasRealDob;
  const knownAge = hasRealDob ? ageFromDob(user!.date_of_birth!) : null;
  // DOB already on file fails the gate — booking is blocked, not re-asked
  const ageBlocked = !!minAge && hasRealDob && (knownAge == null || knownAge < minAge);
  return { needsName, needsDob, ageBlocked };
}
