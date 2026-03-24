import { PostHog } from "posthog-node";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

export const posthog = key
  ? new PostHog(key, { host: "https://us.i.posthog.com" })
  : null;

/** Flush pending events — call on graceful shutdown */
export async function shutdownPostHog(): Promise<void> {
  await posthog?.shutdown();
}
