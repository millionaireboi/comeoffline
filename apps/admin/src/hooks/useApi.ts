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

    // Pre-check: don't attempt fetch if we can't get a token yet.
    // The effect will re-fire when getIdToken updates (user signs in).
    const token = await getIdToken();
    if (!token) {
      if (mountedRef.current) setLoading(false);
      return;
    }

    // Check cache first
    const cached = cache.get(endpoint);
    if (cached && Date.now() - cached.timestamp < dedupingInterval) {
      if (mountedRef.current) {
        setData(cached.data as T);
        setLoading(false);
      }
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

    // Store a promise that resolves to the extracted data (not the full response)
    // so deduped callers get the correct shape
    const dataPromise = apiClient
      .get<{ success: boolean; data: T }>(endpoint)
      .then((response) => {
        if (response.success && response.data !== undefined) {
          return response.data;
        }
        throw new Error("Invalid response format");
      });
    pendingRequests.set(endpoint, dataPromise);

    try {
      const extractedData = await dataPromise;

      if (!mountedRef.current) return;

      setData(extractedData);
      cache.set(endpoint, { data: extractedData, timestamp: Date.now() });
    } catch (err) {
      if (!mountedRef.current) return;

      const error = err as Error & { status?: number };

      // Handle quota errors gracefully
      if (error.status === 429) {
        console.warn("[useApi] Rate limited, using cached data if available");
        const staleCache = cache.get(endpoint);
        if (staleCache) {
          setData(staleCache.data as T);
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
  }, [endpoint, dedupingInterval, getIdToken]);

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

  // Cleanup — reset mountedRef on each mount so StrictMode remounts work
  useEffect(() => {
    mountedRef.current = true;
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
