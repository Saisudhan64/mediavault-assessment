export type AssetStatus = 'draft' | 'in_review' | 'approved' | 'archived';
export type AssetKind = 'image' | 'video' | 'document';

export interface Owner {
  id: string;
  name: string;
}

export interface Asset {
  id: string;
  name: string;
  kind: AssetKind;
  status: AssetStatus;
  tags: string[];
  collectionId: string;
  owner: Owner;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  hasThumbnail: boolean;
}

export interface AssetPage {
  items: Asset[];
  total: number;
  nextCursor: string | null;
}

export interface AssetQuery {
  q?: string;
  status?: AssetStatus[];
  kind?: AssetKind[];
  tag?: string[];
  collectionId?: string;
  owner?: string;
  sort?: 'updatedAt:desc' | 'updatedAt:asc' | 'name:asc' | 'name:desc' | 'sizeBytes:desc' | 'createdAt:desc';
  limit?: number;
  cursor?: string;
}

export const ERROR_MESSAGES: Record<number, string> = {
  429: 'Too many requests — please wait a moment and try again.',
  503: 'Service is temporarily unavailable. Trying again shortly…',
  500: 'Server error. Please try again.',
  404: 'Asset not found.',
  409: 'This asset was updated by someone else. Please refresh.',
  400: 'Invalid request. Please check your filters.',
};

export interface BulkResult {
  results: Array<
    | { id: string; ok: true; asset: Asset }
    | { id: string; ok: false; code: string; message?: string }
  >;
  applied: number;
  failed: number;
}

// types.ts
export const STATUSES: AssetStatus[] = ['draft', 'in_review', 'approved', 'archived'];
