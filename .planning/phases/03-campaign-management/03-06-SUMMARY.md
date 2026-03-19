---
phase: 03-campaign-management
plan: 06
subsystem: ui
tags: [campaign, ux, decision, flexible-slots, airtable, typescript]

# Dependency graph
requires:
  - phase: 03-campaign-management
    provides: CampaignSheet.tsx with 4 flexible date/time picker slots (Plan 03-04)
provides:
  - CAMP-02 and UX-02 requirements status resolved by product owner decision
  - deleteCampaign function in campaigns.ts (fixes missing export)
  - ScheduledMessage type updated for flexible slot design (title, send_date, send_time, slot_index)
  - israelDateTimeToUTC exported from timezone-client.ts for client components
affects:
  - Phase 04 scheduler engine (ScheduledMessage type is now stable)
  - Any future plan touching CampaignSheet slot design

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Product owner decision as gap closure (no code change required when design is intentional deviation)
    - OffsetLabel local type in timezone.ts decoupled from ScheduledMessage interface

key-files:
  created: []
  modified:
    - src/lib/airtable/campaigns.ts
    - src/lib/airtable/types.ts
    - src/lib/airtable/timezone.ts
    - src/lib/timezone-client.ts
    - CLAUDE.md

key-decisions:
  - "CAMP-02/UX-02 design deviation accepted by Michal — flexible date pickers satisfy requirement intent per product owner decision (2026-03-19)"
  - "English Airtable table names must be preserved — Hebrew table names in working tree were erroneous changes from 03-05 and were reverted"

patterns-established:
  - "When a human-verify checkpoint approved a design deviation, follow up with explicit product owner sign-off to close the gap requirements"

requirements-completed:
  - CAMP-02
  - UX-02

# Metrics
duration: 15min
completed: 2026-03-19
---

# Phase 03 Plan 06: Message Slot Design Decision Summary

**CAMP-02 and UX-02 closed by product owner decision: flexible date/time pickers accepted over fixed offset labels, plus 3 auto-fixes for erroneous uncommitted changes from prior plans.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-19T21:10:00Z (continuation from checkpoint)
- **Completed:** 2026-03-19T21:23:14Z
- **Tasks:** 2 of 2 (Task 1: checkpoint decision received; Task 2: implement option-a)
- **Files modified:** 5

## Accomplishments

- CAMP-02 and UX-02 requirements officially closed — Michal chose Option A (keep flexible date pickers)
- Auto-fixed 3 bugs found in uncommitted working tree from prior plans: Hebrew table names reverted, `deleteCampaign` added, `ScheduledMessage` type committed
- All 121 tests pass, TypeScript compiles clean after fixes

## Task Commits

1. **Task 1: Decision checkpoint** — received via continuation context (no commit)
2. **Task 2: Option A — no code changes; auto-fixes committed** — `98da8b7` (fix)
3. **CLAUDE.md added** — `0cee906` (chore)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/lib/airtable/campaigns.ts` — added `deleteCampaign(id)` function (was imported by actions.ts but missing)
- `src/lib/airtable/types.ts` — `ScheduledMessage` interface updated: `title`, `send_date`, `send_time`, `slot_index` replace `send_at` and `offset_label`
- `src/lib/airtable/timezone.ts` — `computeSendAt` uses local `OffsetLabel` type (decoupled from `ScheduledMessage`)
- `src/lib/timezone-client.ts` — `israelDateTimeToUTC` exported as alias for client components
- `CLAUDE.md` — project instructions file added to repo root

## Decisions Made

**CAMP-02/UX-02 — flexible date pickers accepted (Option A)**
Michal chose to keep the current CampaignSheet design (4 numbered slots with free-form date + time pickers) over the original fixed offset labels (שבוע לפני / יום לפני / בוקר האירוע / חצי שעה לפני). The extra flexibility outweighs the original spec's "no manual date entry" intent. Requirements CAMP-02 and UX-02 are marked satisfied by product owner decision.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reverted erroneous Hebrew table names in service layer**
- **Found during:** Task 2 verification (npm test)
- **Issue:** Working tree had Hebrew table names (`הודעות מתוזמנות`, `נרשמות`, `יומן הודעות`, `מתענינות`, `קמפיינים`) in scheduler-services.ts, contacts.ts, message-log.ts, campaigns.ts — causing 7 test failures. CLAUDE.md clearly states "English table names for Airtable (API stability in URLs)".
- **Fix:** `git checkout --` to revert scheduler-services.ts, contacts.ts, message-log.ts, campaigns.ts to committed English names
- **Files modified:** 4 service files (net: reverted to committed state)
- **Verification:** All 121 tests pass after revert
- **Committed in:** Not a separate commit (revert brought back to committed state; the new deleteCampaign commit overwrites campaigns.ts)

**2. [Rule 2 - Missing Critical] Added deleteCampaign to campaigns.ts**
- **Found during:** Task 2 verification (npx tsc --noEmit)
- **Issue:** `src/app/kampanim/actions.ts` imports `deleteCampaign` from campaigns.ts but the function was never exported — TypeScript error TS2305.
- **Fix:** Added `export async function deleteCampaign(id: string): Promise<void>` calling `airtableBase('Campaigns').destroy(id)`
- **Files modified:** `src/lib/airtable/campaigns.ts`
- **Verification:** `npx tsc --noEmit` exits clean
- **Committed in:** `98da8b7`

**3. [Rule 3 - Deferred Uncommitted Changes] Committed types.ts and timezone changes from 03-04/03-05**
- **Found during:** Task 2 (git status showed modified but uncommitted files)
- **Issue:** `types.ts`, `timezone.ts`, `timezone-client.ts` had valid working tree changes (ScheduledMessage interface for flexible slots, OffsetLabel decoupling, israelDateTimeToUTC export) that were never committed in plan 03-05.
- **Fix:** Staged and committed as part of the 03-06 fix commit
- **Files modified:** `src/lib/airtable/types.ts`, `src/lib/airtable/timezone.ts`, `src/lib/timezone-client.ts`
- **Committed in:** `98da8b7`

---

**Total deviations:** 3 auto-fixed (1 bug revert, 1 missing critical, 1 blocking uncommitted state)
**Impact on plan:** All auto-fixes were necessary for correctness and clean TS compilation. No scope creep. Option A required zero CampaignSheet changes.

## Issues Encountered

- Working tree contained ~8 uncommitted files from prior 03-05 work (some correct, some erroneous Hebrew table names). Careful git diff analysis needed before deciding what to stage vs revert.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 3 gap closure is complete — all CAMP-XX and UX-XX requirements for Phase 3 are satisfied
- Phase 6 (stats + polish) is in progress and unaffected by this plan
- `ScheduledMessage` type is now stable with `title`, `send_date`, `send_time`, `slot_index`
- `deleteCampaign` is available for any UI that needs campaign deletion

---
*Phase: 03-campaign-management*
*Completed: 2026-03-19*
