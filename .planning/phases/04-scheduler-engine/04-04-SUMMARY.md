---
phase: 04-scheduler-engine
plan: "04"
subsystem: ui
tags: [green-api, next.js, server-component, settings, whatsapp]

# Dependency graph
requires:
  - phase: 04-01
    provides: getGreenApiState function from green-api.ts
provides:
  - GREEN API live connection status badge on Settings page (/hagdarot)
  - Async server component fetching stateInstance at every page render
affects: [deployment, operations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - force-dynamic server component for live third-party status checks
    - Three-state badge (connected/disconnected/unknown) with Hebrew labels

key-files:
  created: []
  modified:
    - src/app/hagdarot/page.tsx

key-decisions:
  - "force-dynamic added to hagdarot page — static prerender would cache GREEN API state at build time; must be fresh on every visit"
  - "Three-state badge: authorized=green, any non-authorized=red, unknown=gray — unknown covers missing env vars and network errors"

patterns-established:
  - "Live API status checks: force-dynamic server component + try/catch in service returning sentinel value"

requirements-completed: [INFRA-05]

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 4 Plan 4: GREEN API Status Badge Summary

**Async server component on Settings page renders live GREEN API connection status badge with Hebrew label (מחובר/מנותק/סטטוס לא ידוע) fetched fresh on every page render**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-18T21:49:22Z
- **Completed:** 2026-03-18T21:51:14Z
- **Tasks:** 1 (of 2 — checkpoint pending human verify)
- **Files modified:** 1

## Accomplishments
- Converted `hagdarot/page.tsx` from sync to `async` server component with `export const dynamic = 'force-dynamic'`
- Added `getGreenApiState()` call at render time — status always fresh, never stale from build cache
- Three-state badge: green dot + "מחובר" for authorized, red dot + "מנותק" for disconnected, gray dot + "סטטוס לא ידוע" for missing env vars or network errors
- Badge appears at top of GREEN API Card, above setup instructions

## Task Commits

Each task was committed atomically:

1. **Task 1: GREEN API status badge on Settings page** - `b6acd81` (feat)

**Plan metadata:** pending (awaiting human verify checkpoint)

## Files Created/Modified
- `src/app/hagdarot/page.tsx` - Async server component with GREEN API live status badge

## Decisions Made
- Added `export const dynamic = 'force-dynamic'` — without it, Next.js prerendered hagdarot as static (○) at build time, caching the API state permanently. Dynamic ensures the GREEN API is checked on every page visit.
- Three-state badge handles the `unknown` state explicitly so users with missing env vars see actionable guidance rather than a misleading "disconnected" message.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added force-dynamic to ensure live status**
- **Found during:** Task 1 verification (npm run build output)
- **Issue:** Without `export const dynamic = 'force-dynamic'`, Next.js marked /hagdarot as `○ (Static)` — GREEN API state would be frozen at build time, defeating the purpose of a live status indicator
- **Fix:** Added `export const dynamic = 'force-dynamic'` at module level
- **Files modified:** src/app/hagdarot/page.tsx
- **Verification:** npm run build shows `/hagdarot` as `ƒ (Dynamic)` — server-rendered on demand
- **Committed in:** b6acd81 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential fix — status badge would be meaningless without dynamic rendering. No scope creep.

## Issues Encountered
None beyond the force-dynamic fix above.

## User Setup Required
None — GREEN API credentials (GREEN_API_INSTANCE_ID, GREEN_API_TOKEN) already required from Phase 4 Plan 1 setup. Settings page now shows whether they are configured and working.

## Next Phase Readiness
- Phase 4 fully complete pending human verification checkpoint
- Human must verify: Settings page GREEN API badge, CampaignSheet broadcast UI, tests green, scheduler build clean, railway.toml correct

---
*Phase: 04-scheduler-engine*
*Completed: 2026-03-18*
