---
phase: 05-monitoring-error-ux
plan: 02
subsystem: ui
tags: [green-api, banner, campaigns, next.js, server-component, rtl, hebrew]

# Dependency graph
requires:
  - phase: 04-scheduler-engine
    provides: getGreenApiState() function returning 'authorized' | 'notAuthorized' | 'unknown'
provides:
  - Amber disconnect banner on /kampanim when GREEN API state is 'notAuthorized'
  - greenApiState prop wired from server page to client component
affects: [05-monitoring-error-ux, future-campaign-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server component fetches GREEN API state at render time — no client polling
    - Three-state conditional banner: only 'notAuthorized' triggers warning, 'unknown' (missing env vars) is silent

key-files:
  created: []
  modified:
    - src/app/kampanim/page.tsx
    - src/components/campaigns/CampaignsPageClient.tsx

key-decisions:
  - "Banner only on 'notAuthorized' — 'unknown' (missing env vars / network error) shows no warning to avoid false alarms in dev environments"
  - "Banner is persistent/non-dismissible — reconnect action required to clear it"
  - "dir=rtl inherited from HTML root — no extra dir attribute needed on banner element"

patterns-established:
  - "Pattern: Server page passes connection-state prop to client component — client stays pure UI with no async calls"
  - "Pattern: Amber border/bg/text Tailwind classes for non-critical but actionable warnings"

requirements-completed: [MON-03]

# Metrics
duration: 10min
completed: 2026-03-19
---

# Phase 5 Plan 02: GREEN API Disconnect Banner Summary

**Persistent amber Hebrew banner on /kampanim shows when GREEN API is disconnected, with direct link to /hagdarot — server-fetched at render time, no client polling**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-19T11:40:00Z
- **Completed:** 2026-03-19T11:50:00Z
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 2

## Accomplishments

- `kampanim/page.tsx` now calls `getGreenApiState()` in `Promise.all` alongside existing data fetches and passes result as `greenApiState` prop
- `CampaignsPageClient` renders conditional amber banner at the top of the page when `greenApiState === 'notAuthorized'`
- Banner text "גרין אפיאי מנותקת — הודעות לא ישלחו" with "הגדרות" link to `/hagdarot` — exact text locked by user decision
- Visual verification checkpoint passed by user — banner appears correctly when disconnected, absent when connected or env vars missing

## Task Commits

Each task was committed atomically:

1. **Task 1: Add getGreenApiState to kampanim/page.tsx and wire banner prop** - `75ea683` (feat)
2. **Task 2: Human verify — GREEN API disconnect banner** - checkpoint approved by user, no code commit

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `src/app/kampanim/page.tsx` - Added `getGreenApiState()` to Promise.all; passes `greenApiState` prop to client component
- `src/components/campaigns/CampaignsPageClient.tsx` - Added `greenApiState: string` prop; renders amber banner as first child when state is 'notAuthorized'

## Decisions Made

- Banner only shown for `'notAuthorized'` — not for `'unknown'` (missing env vars / network error) to avoid noise in dev environments where GREEN API credentials may not be configured
- Banner is persistent and non-dismissible; clearing it requires actually reconnecting GREEN API via /hagdarot
- `force-dynamic` directive on `kampanim/page.tsx` was already present and preserved — ensures state is always live at page load

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- MON-03 satisfied: Michal sees GREEN API connection status directly on the campaigns page where it matters
- Phase 5 Plan 03 (final plan) can proceed — all wave 1 plans complete

---
*Phase: 05-monitoring-error-ux*
*Completed: 2026-03-19*
