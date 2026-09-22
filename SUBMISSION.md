# Submission

## Video walkthrough

**Link:** https://drive.google.com/file/d/1oStyPQrb2RsC6e1PgNdJVXrZqSQu0COU/view?usp=sharing

---

## Deployed links

- **Frontend:** https://mediavault-assessment-eight.vercel.app
- **API:** https://mediavault-assessment-production.up.railway.app/api/health
- **GitHub:** https://github.com/Saisudhan64/mediavault-assessment

---

## How to run it

```bash
npm install
npm run dev
```

Open http://localhost:5173 for the app and http://localhost:8787/api/health to confirm the API is running with chaos enabled.

---

## Time spent

~3 days, roughly split as:
- Task 0 (audit): 2 hours
- Task 1 (search correctness): 4 hours
- Task 4 (resilience): 2 hours
- Task 2 (scale/virtualization): 5 hours
- Task 3 (bulk actions): 4 hours
- SUBMISSION.md + video: 1 hour

---

## Baseline defects found

| # | Defect | Where | Status |
|---|---|---|---|
| 1 | Bulk update sends all ids in one call — API rejects above 50 | `App.tsx` | Fixed in Task 3 |
| 2 | `.card` div had `overflow: hidden` which clips content in detail view | `styles.css` | Fixed |
| 3 | `px` units used throughout instead of `rem` — not accessible for users who change browser font size | `styles.css` | Knowingly left — refactoring entire stylesheet was out of scope |
| 4 | Thumbnail fetched even when `hasThumbnail` is false — causes 404 requests and broken image icon | `AssetGrid.tsx` | Fixed — now checks `hasThumbnail` before rendering `<img>` |
| 5 | Pill modifier classes used hardcoded hex values instead of CSS variables, and `pill--draft` was missing entirely | `styles.css` | Fixed — added `--status-*` tokens to `:root` and `pill--draft` class |
| 6 | `STATUSES` array defined identically in both `App.tsx` and `AssetDetail.tsx` — violates single source of truth | `App.tsx`, `AssetDetail.tsx` | Fixed — moved to `types.ts` and imported from there |
| 7 | All user-facing strings hardcoded in components — no i18n support | Throughout | Knowingly left — i18n out of scope for this assessment |
| 8 | `handleSaved` handler left empty — grid never updates after detail panel save | `App.tsx` | Fixed — uses `queryClient.invalidateQueries` with `refetchType: 'all'` |
| 9 | No debounce on search input — every keystroke fired an API request | `App.tsx` | Fixed — 300ms debounce via `useDebounce` hook |
| 10 | No utility CSS classes — same flex/layout rules repeated across many selectors | `styles.css` | Knowingly left — would use Tailwind in a real project |
| 11 | No request cancellation, deduplication, or race condition handling | `useAssets.ts`, `client.ts` | Fixed in Task 1 via TanStack Query |
| 12 | Loading states show no visual feedback — no spinner, no skeleton | Throughout | Knowingly left — Lottie/skeleton out of scope |
| 13 | `isLoading` and `isError` not passed to `AssetGrid` — grid showed "no results" during loading | `App.tsx`, `AssetGrid.tsx` | Fixed — both passed as props |
| 14 | String literal `alt="{asset.name}"` in `AssetDetail` — rendered as literal text not asset name | `AssetDetail.tsx` | Fixed |

---

## Key decisions

**Data fetching and caching**

Used TanStack Query (`useInfiniteQuery`) for all asset list fetching. It gave us request deduplication, cancellation via `AbortSignal`, cursor-based pagination, and cache management for free. The query key encodes the full filter state — any filter change automatically cancels the previous request and fires a new one. `staleTime: 30_000` prevents unnecessary refetches during normal browsing while `refetchType: 'all'` on `invalidateQueries` forces fresh data after mutations.

Considered plain `useEffect` + `useState` but rejected it — managing race conditions, cancellation, and pagination accumulation manually adds significant complexity and risk.

**Stale response handling**

TanStack Query cancels in-flight requests automatically when the query key changes by passing an `AbortSignal` into `queryFn`. This means when the user types a new search term, the previous request is actively cancelled — not just ignored. No manual `AbortController` or request ID tracking needed.

**Virtualization approach**

Used `@tanstack/react-virtual` for row-level virtualization. Assets are grouped into rows of 6, and the virtualizer renders only the rows visible in the viewport plus 2 overscan rows. The DOM node count stays flat regardless of how many pages are loaded.

Infinite scroll is triggered by checking if the last virtual row is the last row in the list — no sentinel div needed since the virtualizer already tracks which items are visible.

Extracted `AssetCard` as a separate `memo` component receiving `isSelected` and `isActive` as booleans instead of the full `selectedIds` Set. Combined with `useCallback` on `toggleSelect`, this ensures only the toggled card re-renders on selection change.

**Optimistic updates and rollback**

Chose `invalidateQueries` over optimistic cache updates for bulk actions. The tradeoff: slightly slower feedback (waits for refetch) but guaranteed correctness — no risk of showing stale data or complex rollback logic. Given the hostile API (503s, partial failures), optimistic updates would need robust rollback anyway, making the complexity cost high for uncertain gain.

For the detail panel save, used `setQueryData` to update just the changed asset in cache — instant feedback, no full refetch needed.

**Retry and backoff policy**

Extended `client.ts` to attach `status` and `retryAfter` to thrown errors using `Object.assign`. TanStack Query's `retry` and `retryDelay` callbacks use these to make correct decisions:
- Retry: 500, 503, 429 — yes (up to 3 times)
- Retry: 400, 409, 422 — no (non-retryable by definition)
- Delay: honours `Retry-After` header when present, falls back to 2 seconds

**State placement and URL sync**

All filter state (`q`, `status`, `sort`) lives in `App.tsx` as `useState` — no Zustand or Redux needed. The app is single-page with no deep prop drilling. Server state is owned entirely by TanStack Query.

Filter state is synced to the URL via `URLSearchParams` and `history.replaceState` — so filters persist on reload and are shareable. `replaceState` used instead of `pushState` so keystrokes don't stack up as history entries. Initial state is read from the URL on mount.

Debounced search uses a separate `debouncedQ` value — raw `q` updates instantly for responsive input, `debouncedQ` updates after 300ms and drives the query key. 300ms chosen because average typing speed is ~5 chars/sec (~200ms between keystrokes), so 300ms reliably catches end of word without feeling sluggish.

**Bulk actions**

`bulkSetStatus` in `client.ts` chunks ids into batches of 50 (API hard cap) and runs them with bounded concurrency of 3 simultaneous requests. 3 was chosen as a balance between speed and rate limit safety — aggressive enough to be fast, conservative enough to leave headroom for other concurrent requests. Results from all chunks are merged into one `BulkResult`.

Partial failures are surfaced clearly — `legal-hold` failures are distinguished from random failures, and retryable failed ids are stored in state so the user can reselect and retry them in one click.

---

## Performance

Measured on Windows 11, Chrome 128, on local dev server.

| Metric | Before | After | How measured |
|---|---|---|---|
| Rendered DOM nodes at 500 rows loaded | 500+ card divs | ~12 visible row divs | Chrome DevTools Elements panel |
| Cards re-rendered when toggling one selection | 24 (all visible) | 1 (toggled card only) | `console.log` in `AssetCard`, confirmed 1 log per toggle |
| Requests fired while typing a 6-character query | 6 (one per keystroke) | 1 (after 300ms pause) | Chrome DevTools Network tab |
| Production bundle, gzipped | 48 kB (baseline) | ~72 kB (TanStack Query + Virtual added) | `npm run build` output |

The main bottleneck before virtualization was all cards re-rendering on selection change. Fixed by extracting `AssetCard` with `memo` and passing primitive `isSelected`/`isActive` booleans instead of the full `selectedIds` Set.

---

## Accessibility

Keyboard model is minimal — the baseline focus ring (`:focus-visible` with `--accent` color) is preserved, and all interactive elements (buttons, checkboxes, inputs) are natively focusable. Status buttons in the detail panel are standard `<button>` elements. No custom keyboard navigation was implemented — cards are `div` elements not reachable by keyboard.

Not tested with a screen reader. Checkboxes have no `aria-label` — announced as "checkbox" with no asset context.

Known gaps: cards not keyboard accessible, checkboxes have no accessible name, no focus management when detail panel opens/closes. These are Task 5 items that were not implemented.

---

## Interface decisions

The interface optimises for speed of scanning — producers and reviewers need to find and move assets quickly, not read a polished UI. Decisions follow from that: dense grid, small pills, minimal chrome.

- **Visual system.** Uses the existing CSS variable system. Extended it with `--status-*` tokens for the four status colors, and `--notice` for success messages. All status colors now live in `:root` and are referenced consistently — no hardcoded hex values in component rules.
- **Status treatment.** The four statuses read as a linear progression (Draft → In review → Approved → Archived). Each has a distinct pill color: grey for draft, amber for in review, green for approved, faded text for archived. Color is not the only signal — the label text always accompanies the color.
- **States.** Loading shows "Loading…" in both the filter bar and the grid. Empty shows "Nothing matches these filters" with a suggestion. Error shows a human-readable message (not raw HTTP status) in both the filter bar and grid. Offline shows a full-width red banner and pauses all queries. Partial bulk failure shows a retry banner distinguishing legal-hold failures (permanent) from random failures (retryable).
- **Contrast.** Not formally checked against WCAG AA. The existing color palette appears to have sufficient contrast but was not audited with a tool.
- **Copy.** Rewrote raw error messages (`503: Service Unavailable`) to plain language (`Service is temporarily unavailable. Trying again shortly…`). Added `Retry-After`-aware messaging. Bulk failure notice distinguishes legal holds from retryable failures explicitly.

---

## Trade-offs and cuts

**Task 5 (keyboard & accessibility) — skipped.** Cards are `div` elements with no `tabIndex` or `onKeyDown`. Checkboxes have no `aria-label`. Focus is not managed when the detail panel opens. With another day I would make cards focusable, add `aria-label` to checkboxes, and trap focus in the panel.

**Task 6 (interface design) — skipped.** The visual system is functional but not polished. With another day I would add skeleton loading states, improve the status progression visually, and audit contrast formally.

**Range selection (shift+click) — not implemented.** Select all is implemented. Shift+click would require tracking `lastSelectedId` and finding the range in the `items` array — doable but time-constrained.

**Optimistic bulk updates — not implemented.** Chose `invalidateQueries` for simplicity and correctness. With another day I would implement optimistic updates with rollback using `setQueryData` and the per-id results from the `207` response.

**Offline write queue — not implemented.** Writes made while offline are not queued. With another day I would queue mutations and replay them when the connection returns.

---

## Critique of the API

- **Cursors bound to queries** is correct behavior but the error code `stale_cursor` could include the original query fingerprint so the client can detect which query the cursor belongs to, rather than needing to reset defensively on every filter change.
- **`Retry-After` on 429** is good — most APIs don't bother. The 80 req/10s rate limit is tight enough that normal typing without debounce hits it easily. A higher limit or a per-resource limit (rather than global) would be more realistic.
- **6% flaky reads on `GET /api/assets`** is realistic but the lack of an idempotency key on `PATCH` means retrying a failed write risks double-applying. A `409 version_conflict` protects against this but requires the client to refetch before retrying.
- **Bulk endpoint capped at 50 ids** with no cursor-based alternative means large selections require many round trips. A streaming or webhook-based approach would be better for very large bulk operations.
- **`x-request-id` header** is exposed but never used in the client. In production this would be invaluable for correlating client errors with server logs — the client should log it on every failed request.

---

## Anything you would like us to look at

**`runWithConcurrency` in `client.ts`** — a small generic utility that runs async tasks with bounded parallelism. It uses a shared index counter and multiple worker coroutines rather than chunking the task list into fixed batches. This means workers self-schedule — a fast worker picks up the next task immediately without waiting for slower workers in its batch. I'm happy with this approach and would use it again.

**`useAssets` hook** — the separation between `client.ts` (service layer, no React) and `useAssets.ts` (React hook, no URLs) felt clean throughout. Adding TanStack Query, retry logic, and pagination never required touching the service layer's URL construction or error handling — they composed well.

**The `handleSaved` decision** — I chose `invalidateQueries` with `refetchType: 'all'` over `setQueryData` for the detail panel save. This triggers a full refetch rather than a surgical cache update. The tradeoff is an extra network request, but it guarantees the grid always reflects server state. Given the API is already flaky, I preferred correctness over the minor performance gain of a cache-only update. Happy to discuss if you'd prefer the optimistic approach.