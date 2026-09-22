import { useState, useEffect, useCallback } from 'react';
import { bulkSetStatus } from '@/api/client';
import { AssetDetail } from '@/features/assets/AssetDetail';
import { AssetGrid } from '@/features/assets/AssetGrid';
import { useAssets } from '@/features/assets/useAssets';
import { statusLabel } from '@/lib/format';
import type { Asset, AssetStatus, AssetQuery } from '@/lib/types';
import { ERROR_MESSAGES, STATUSES } from '@/lib/types';
import { useDebounce } from '@/lib/useDebounce';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { useQueryClient } from '@tanstack/react-query';



const SORTS: Array<{ value: NonNullable<AssetQuery['sort']>; label: string }> = [
  { value: 'updatedAt:desc', label: 'Recently updated' },
  { value: 'name:asc', label: 'Name A–Z' },
  { value: 'sizeBytes:desc', label: 'Largest first' },
  { value: 'createdAt:desc', label: 'Newest' },
];

export function App() {
  const params = new URLSearchParams(window.location.search);
  const statusParam = params.get('status');

  const [q, setQ] = useState(params.get('q') ?? '');
  const [status, setStatus] = useState<AssetStatus[]>(
    statusParam ? (statusParam.split(',') as AssetStatus[]) : []
  );
  const [sort, setSort] = useState<NonNullable<AssetQuery['sort']>>(
    (params.get('sort') as NonNullable<AssetQuery['sort']>) ?? 'updatedAt:desc'
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [failedIds, setFailedIds] = useState<string[]>([]);

  const debouncedQ = useDebounce(q, 300);
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();


  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status.length) params.set('status', status.join(','));
    if (sort !== 'updatedAt:desc') params.set('sort', sort);
    window.history.replaceState({}, '', `?${params}`);
  }, [q, status, sort]);


  const { items, total, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useAssets({ q: debouncedQ, status, sort, limit: 24 });

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []); // empty deps — never recreated

  async function applyBulkStatus(next: AssetStatus) {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setNotice(null);
    try {
      const result = await bulkSetStatus(ids, next);

      const failures = result.results.filter(r => !r.ok);
      const legalHolds = failures.filter(r => r.code === 'legal-hold');
      const retryable = failures.filter(r => r.code !== 'legal-hold');
      setFailedIds(retryable.map(r => r.id));

      let message = `${result.applied} updated`;
      if (legalHolds.length) message += `, ${legalHolds.length} blocked by legal hold`;
      if (retryable.length) message += `, ${retryable.length} failed (can retry)`;

      setNotice(message);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({
        queryKey: ['assets'],
        refetchType: 'all'
      });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Bulk update failed');
    }
  }

  function handleSaved(_asset: Asset) {
    queryClient.invalidateQueries({
      queryKey: ['assets'],
      refetchType: 'all'
    });
  }

  function selectAll() {
    setSelectedIds(new Set(items.map(item => item.id)));
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>MediaVault</h1>
        <input
          className="search"
          type="search"
          placeholder="Search assets"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </header>
      {!isOnline && (
        <div className="offline-banner">
          You are offline. Waiting for connection…
        </div>
      )}
      <div className="filters">
        {STATUSES.map((s) => (
          <label key={s}>
            <input
              type="checkbox"
              checked={status.includes(s)}
              onChange={(e) =>
                setStatus((prev) =>
                  e.target.checked ? [...prev, s] : prev.filter((x) => x !== s),
                )
              }
            />
            {statusLabel(s)}
          </label>
        ))}
        <button onClick={selectAll}>Select all</button>
        <span className="muted">
          {isLoading
            ? 'Loading…'
            : isError
              ? 'Request failed'
              : items.length === 0
                ? 'No results'
                : `${items.length} of ${total.toLocaleString()} shown`}
        </span>
      </div>

      {selectedIds.size > 0 && (
        <div className="bulkbar">
          <span>{selectedIds.size} selected</span>
          {STATUSES.map((s) => (
            <button key={s} onClick={() => applyBulkStatus(s)}>
              Set {statusLabel(s).toLowerCase()}
            </button>
          ))}
          <button onClick={() => setSelectedIds(new Set())}>Clear selection</button>
        </div>
      )}

      {notice && <p className="notice">{notice}</p>}

      {failedIds.length > 0 && (
          <div className="bulkbar">
            <span> {failedIds.length} assets failed — click "Retry failed" to reselect them, then choose a status to update</span>
            <button onClick={() => {
              setSelectedIds(new Set(failedIds));
              setFailedIds([]);
            }}>
              Retry failed
            </button>
            <button onClick={() => setFailedIds([])}>
              Dismiss
            </button>
          </div>
    )}

      {error && (
        <p className="error">
          {ERROR_MESSAGES[(error as any)?.status]
            ?? (error as Error)?.message === 'Failed to fetch'
            ? 'Unable to connect. Please check your connection.'
            : (error as Error)?.message
            ?? 'Something went wrong'}
        </p>
      )}

      <main className="content">
        <AssetGrid
          assets={items}
          selectedIds={selectedIds}
          activeId={activeId}
          isLoading={isLoading}
          isError={isError}
          error={error}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage ?? false}
          isFetchingNextPage={isFetchingNextPage}
          onToggleSelect={toggleSelect}
          onOpen={setActiveId}
        />
        {activeId && (
          <AssetDetail id={activeId} onClose={() => setActiveId(null)} onSaved={handleSaved} />
        )}
      </main>
    </div>
  );
}
