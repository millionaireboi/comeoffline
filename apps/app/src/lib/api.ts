const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface FetchOptions extends RequestInit {
  token?: string;
  /** Max retry attempts for transient failures (429, 502, 503, 504). Default: 2 */
  retries?: number;
}

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { token, headers, retries = 2, ...rest } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${API_URL}${path}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        signal: controller.signal,
        ...rest,
      });

      clearTimeout(timeoutId);

      // Retry on transient server errors
      if (RETRYABLE_STATUSES.has(res.status) && attempt < retries) {
        // Use Retry-After header if present, otherwise exponential backoff
        const retryAfter = res.headers.get("Retry-After");
        const delay = retryAfter
          ? Math.min(parseInt(retryAfter, 10) * 1000, 10000)
          : Math.min(1000 * 2 ** attempt, 8000);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Invalid JSON response from ${path}`);
      }

      if (!res.ok) {
        throw new Error(data.error || `API error: ${res.status}`);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        lastError = new Error("Request timeout");
        // Retry timeouts
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
          continue;
        }
      } else {
        lastError = error instanceof Error ? error : new Error(String(error));
        // Don't retry non-transient errors (auth failures, validation errors, etc.)
        throw lastError;
      }
    }
  }

  throw lastError || new Error(`Request failed after ${retries + 1} attempts`);
}
