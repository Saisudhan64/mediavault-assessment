import { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ERROR_MESSAGES, type Asset } from '@/lib/types';
import { AssetCard } from './AssetCard';

interface Props {
  assets: Asset[];
  selectedIds: Set<string>;
  activeId: string | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
}

export function AssetGrid({
  assets,
  selectedIds,
  activeId,
  isLoading,
  isError,
  error,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  onToggleSelect,
  onOpen,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const CARD_HEIGHT = 280;
  const COLUMNS = 6;

  const rows: Asset[][] = [];
  for (let i = 0; i < assets.length; i += COLUMNS) {
    rows.push(assets.slice(i, i + COLUMNS));
  }

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_HEIGHT,
    overscan: 2,
  });

  useEffect(() => {
    const lastItem = virtualizer.getVirtualItems().at(-1);
    if (!lastItem) return;
    if (lastItem.index >= rows.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [virtualizer.getVirtualItems(), hasNextPage, isFetchingNextPage, fetchNextPage, rows.length]);

  if (isLoading) {
    return (
      <div className="empty">
        <p>Loading…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="empty">
        <p>{ERROR_MESSAGES[(error as any)?.status] ?? 'Something went wrong'}</p>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="empty">
        <p>Nothing matches these filters.</p>
        <p className="muted">Clear the search box or widen the status filter.</p>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="grid-viewport">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${CARD_HEIGHT}px`,
                transform: `translateY(${virtualRow.start}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
                gap: '12px',
                padding: '16px',
              }}
            >
              {row && row.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  isSelected={selectedIds.has(asset.id)}
                  isActive={activeId === asset.id}
                  onToggleSelect={onToggleSelect}
                  onOpen={onOpen}
                />
              ))}
            </div>
          );
        })}
      </div>
      {isFetchingNextPage && (
        <p className="muted grid__loading-more">Loading more…</p>
      )}
    </div>
  );
}