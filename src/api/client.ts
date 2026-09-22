import type { Asset, AssetPage, AssetQuery, BulkResult } from '@/lib/types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

function toSearchParams(query: AssetQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.status?.length) params.set('status', query.status.join(','));
  if (query.kind?.length) params.set('kind', query.kind.join(','));
  if (query.tag?.length) params.set('tag', query.tag.join(','));
  if (query.collectionId) params.set('collectionId', query.collectionId);
  if (query.owner) params.set('owner', query.owner);
  if (query.sort) params.set('sort', query.sort);
  if (query.limit) params.set('limit', String(query.limit));
  if (query.cursor) params.set('cursor', query.cursor);
  return params.toString();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.error?.message ?? detail;
    } catch {
      /* response was not JSON */
    }
    const retryAfter = Number(res.headers.get('Retry-After')) || undefined;
    const err = new Error(detail) as Error & { status: number; retryAfter?: number };
    err.status = res.status;
    err.retryAfter = retryAfter;
    throw err;
  }
  return res.json() as Promise<T>;
}

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const current = index++;
      const task = tasks[current];
      if (!task) continue;
      results[current] = await task();
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, () => worker())
  );

  return results;
}

export function listAssets(query: AssetQuery, init?: RequestInit): Promise<AssetPage> {
  return request<AssetPage>(`${API_BASE}/api/assets?${toSearchParams(query)}`, init);
}

export function getAsset(id: string): Promise<Asset> {
  return request<Asset>(`${API_BASE}/api/assets/${id}`);
}

export function getAssetsByIds(ids: string[]): Promise<{ items: Asset[]; missing: string[] }> {
  return request(`${API_BASE}/api/assets/batch?ids=${ids.join(',')}`);
}

export function updateAsset(
  id: string,
  version: number,
  patch: Partial<Pick<Asset, 'name' | 'status' | 'tags'>>,
): Promise<Asset> {
  return request<Asset>(`${API_BASE}/api/assets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ version, patch }),
  });
}

export async function bulkSetStatus(
  ids: string[],
  status: Asset['status']
): Promise<BulkResult> {
  const CHUNK_SIZE = 50;
  const CONCURRENCY = 3;

  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + CHUNK_SIZE));
  }

  const tasks = chunks.map((chunk) => () =>
    request<BulkResult>(`${API_BASE}/api/assets/bulk-status`, {
      method: 'POST',
      body: JSON.stringify({ ids: chunk, status }),
    })
  );

  const chunkResults = await runWithConcurrency(tasks, CONCURRENCY);

  return chunkResults.reduce<BulkResult>(
    (acc, result) => ({
      results: [...acc.results, ...result.results],
      applied: acc.applied + result.applied,
      failed: acc.failed + result.failed,
    }),
    { results: [], applied: 0, failed: 0 }
  );
}

export const thumbnailUrl = (id: string) => `${API_BASE}/api/thumb/${id}.svg`;