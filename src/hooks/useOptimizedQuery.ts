import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

interface OptimizedQueryOptions<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
  enabled?: boolean;
}

export const useOptimizedQuery = <T>({
  queryKey,
  queryFn,
  staleTime = 5 * 60 * 1000, // 5 minutes
  cacheTime = 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus = false,
  enabled = true
}: OptimizedQueryOptions<T>) => {
  const queryClient = useQueryClient();

  // Prefetch related queries for better UX
  useEffect(() => {
    const prefetchRelatedData = () => {
      // Prefetch commonly accessed data
      if (queryKey.includes('user') && queryKey.includes('orders')) {
        queryClient.prefetchQuery({
          queryKey: ['user', 'cart'],
          queryFn: () => Promise.resolve([]), // Empty implementation for demo
          staleTime
        });
      }
    };

    if (enabled) {
      prefetchRelatedData();
    }
  }, [queryKey, queryClient, staleTime, enabled]);

  return useQuery({
    queryKey,
    queryFn,
    staleTime,
    gcTime: cacheTime,
    refetchOnWindowFocus,
    enabled,
    retry: (failureCount, error) => {
      // Exponential backoff retry logic
      if (failureCount < 3) {
        const delay = Math.pow(2, failureCount) * 1000;
        setTimeout(() => {}, delay);
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
};

// Hook for optimized Firebase queries
export const useFirebaseQuery = <T>(
  collectionName: string,
  queryFn: () => Promise<T>,
  dependencies: any[] = []
) => {
  return useOptimizedQuery({
    queryKey: ['firebase', collectionName, ...dependencies],
    queryFn,
    staleTime: 2 * 60 * 1000, // 2 minutes for Firebase data
    cacheTime: 5 * 60 * 1000  // 5 minutes cache
  });
};