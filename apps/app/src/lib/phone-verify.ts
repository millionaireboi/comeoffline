/**
 * "off" = the WhatsApp sender is restricted by Meta, so phone OTPs can't be
 * delivered. New numbers enter without a code (express, BookMyShow-style) and
 * existing members sign in with handle + PIN. Flip the env back once the
 * restriction lifts — the API's ALLOW_UNVERIFIED_PHONE flag must match.
 */
export const phoneVerifyOff = process.env.NEXT_PUBLIC_PHONE_VERIFY === "off";
