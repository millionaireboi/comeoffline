import { useState, useEffect, useRef, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "./useAuth";

interface UseApiOptions {
  /** Auto-fetch on mount (default: true) */
  autoFetch?: boolean;
  /** Refresh interval in ms (0 = no auto-refresh) */
  refreshInterval?: number;
  /** Dedupe requests within this window (ms) */
  dedupingInterval?: number;
}

interface UseApiReturn<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  mutate: (newData?: T) => void;
  refetch: () => Promise<void>;
}

// Global cache to share data across components
const cache = new Map<string, { data: unknown; timestamp: number }>();
const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * Production-ready data fetching hook with caching, deduping, and auto-refresh
 * Similar to SWR but lighter weight
 */
export function useApi<T>(
  endpoint: string | null,
  options: UseApiOptions = {}
): UseApiReturn<T> {
  const {
    autoFetch = true,
    refreshInterval = 0,
    dedupingInterval = 2000,
  } = options;

  const { getIdToken } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const mountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (showLoading = true) => {
    if (!endpoint) return;

    // Ensure token provider is set before making request
    apiClient.setTokenProvider(getIdToken);

    // Check cache first
    const cached = cache.get(endpoint);
    if (cached && Date.now() - cached.timestamp < dedupingInterval) {
      setData(cached.data as T);
      setLoading(false);
      return;
    }

    // Check for pending request (deduping)
    const pending = pendingRequests.get(endpoint);
    if (pending) {
      try {
        const result = await pending;
        if (mountedRef.current) {
          setData(result as T);
          setLoading(false);
        }
        return;
      } catch (err) {
        if (mountedRef.current) {
          setError(err as Error);
          setLoading(false);
        }
        return;
      }
    }

    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    const requestPromise = apiClient.get<{ success: boolean; data: T }>(endpoint);
    pendingRequests.set(endpoint, requestPromise);

    try {
      const response = await requestPromise;

      if (!mountedRef.current) return;

      if (response.success && response.data) {
        setData(response.data);
        // Update cache
        cache.set(endpoint, { data: response.data, timestamp: Date.now() });
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      if (!mountedRef.current) return;

      const error = err as Error & { status?: number };

      // Handle quota errors gracefully
      if (error.status === 429) {
        console.warn("[useApi] Rate limited, using cached data if available");
        // Keep existing data instead of showing error
        if (!data && cached) {
          setData(cached.data as T);
        }
        setError(new Error("Rate limited. Showing cached data."));
      } else {
        setError(error);
      }
    } finally {
      pendingRequests.delete(endpoint);
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [endpoint, dedupingInterval, data, getIdToken]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch && endpoint) {
      fetchData();
    }
  }, [endpoint, autoFetch, fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0 && endpoint) {
      intervalRef.current = setInterval(() => {
        fetchData(false); // Don't show loading on background refresh
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refreshInterval, endpoint, fetchData]);

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const mutate = useCallback((newData?: T) => {
    if (!endpoint) return;

    if (newData !== undefined) {
      setData(newData);
      cache.set(endpoint, { data: newData, timestamp: Date.now() });
    } else {
      // Clear cache and refetch
      cache.delete(endpoint);
      fetchData();
    }
  }, [endpoint, fetchData]);

  const refetch = useCallback(async () => {
    if (!endpoint) return;
    cache.delete(endpoint);
    await fetchData();
  }, [endpoint, fetchData]);

  return { data, error, loading, mutate, refetch };
}
