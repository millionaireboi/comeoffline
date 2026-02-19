import { API_URL } from "@/components/shared/P";

export async function apiFetch<T = unknown>(
  endpoint: string,
  options?: RequestInit,
): Promise<{ success: boolean; data?: T; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      signal: controller.signal,
      ...options,
    });

    if (!res.ok) {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        return { success: false, error: json.error || `Request failed (${res.status})` };
      } catch {
        return { success: false, error: `Request failed (${res.status})` };
      }
    }

    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { success: false, error: "Invalid response from server." };
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { success: false, error: "Request timed out. Please try again." };
    }
    return { success: false, error: "Network error. Please try again." };
  } finally {
    clearTimeout(timeout);
  }
}
