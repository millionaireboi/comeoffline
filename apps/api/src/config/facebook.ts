const pixelId = process.env.FB_PIXEL_ID;
const accessToken = process.env.FB_CONVERSIONS_API_TOKEN;

interface FbEventData {
  event_name: string;
  event_time: number;
  user_data: {
    em?: string; // hashed email
    ph?: string; // hashed phone
    external_id?: string; // user ID
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string; // click ID
    fbp?: string; // browser ID
  };
  custom_data?: Record<string, unknown>;
  event_source_url?: string;
  action_source: "website" | "server";
}

/**
 * Send a server-side event to Facebook Conversions API.
 * Requires FB_PIXEL_ID and FB_CONVERSIONS_API_TOKEN env vars.
 */
export async function sendFbConversionEvent(event: FbEventData): Promise<void> {
  if (!pixelId || !accessToken) return;

  try {
    const url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${accessToken}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [event],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn("[facebook] Conversions API error:", response.status, body);
    }
  } catch (err) {
    console.warn("[facebook] Conversions API request failed (non-blocking):", err);
  }
}

/**
 * Hash a value with SHA-256 for Facebook user data matching.
 */
export async function hashForFb(value: string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export const isFbConfigured = Boolean(pixelId && accessToken);
