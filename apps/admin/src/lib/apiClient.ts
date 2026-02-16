const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

/**
 * Exponential backoff retry utility
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (error: Error, attempt: number) => {
      // Don't retry on client errors (4xx) except 429 (rate limit)
      if ('status' in error && typeof error.status === 'number') {
        const status = error.status;
        if (status >= 400 && status < 500 && status !== 429) {
          return false;
        }
      }
      return attempt < maxRetries;
    },
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (!shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        initialDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );

      console.warn(`[apiClient] Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * API client with automatic retry, error handling, and token management
 */
export class ApiClient {
  private getToken: (() => Promise<string | null>) | null = null;

  setTokenProvider(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getToken?.();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error || `HTTP ${response.status}`) as Error & { status?: number; data?: unknown };
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return withRetry(() => this.request<T>(endpoint, { ...options, method: "GET" }));
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return withRetry(() =>
      this.request<T>(endpoint, {
        ...options,
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      })
    );
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return withRetry(() =>
      this.request<T>(endpoint, {
        ...options,
        method: "PUT",
        body: body ? JSON.stringify(body) : undefined,
      })
    );
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return withRetry(() => this.request<T>(endpoint, { ...options, method: "DELETE" }));
  }
}

export const apiClient = new ApiClient();
