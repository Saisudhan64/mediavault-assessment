import { useInfiniteQuery } from '@tanstack/react-query';
import { listAssets } from '@/api/client';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import type { AssetQuery } from '@/lib/types';

const RETRYABLE_STATUSES = [500, 503, 429];

export function useAssets(query: AssetQuery) {
  const isOnline = useOnlineStatus();

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['assets', query],
    queryFn: (params: { signal: AbortSignal; pageParam: string | null }) =>
    listAssets({ ...query, cursor: params.pageParam ?? undefined }, { signal: params.signal }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    enabled: isOnline,
    retry: (failureCount, error: any) => {
      if (!RETRYABLE_STATUSES.includes(error?.status)) return false;
      return failureCount < 3;
    },
    retryDelay: (_, error: any) => {
      const retryAfter = error?.retryAfter;
      return retryAfter ? retryAfter * 1000 : 2000;
    },
  });

  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return {
    items,
    total,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
}