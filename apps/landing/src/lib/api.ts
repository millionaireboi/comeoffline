import { API_URL } from "@/components/shared/P";

export async function apiFetch<T = unknown>(
  endpoint: string,
  options?: RequestInit,
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    return await res.json();
  } catch {
    return { success: false, error: "Network error. Please try again." };
  }
}
