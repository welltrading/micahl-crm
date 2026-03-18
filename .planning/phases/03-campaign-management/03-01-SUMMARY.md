---
phase: 03-campaign-management
plan: 01
subsystem: testing
tags: [timezone, dst, israel, intl, jest, tdd, airtable]

# Dependency graph
requires:
  - phase: 02-contact-crm
    provides: established Airtable mock pattern (mockTable/mockSelect/mockAll) used in test files
provides:
  - localIsraelToUTC: DST-safe conversion from Israel local time to UTC ISO8601
  - computeSendAt: offset-label-aware send_at calculation for all 4 scheduled message types
  - timezone.test.ts: 9 passing tests covering DST boundary cases for 2026
  - scheduled-messages.test.ts: Wave 0 test stubs for upsertScheduledMessages and updateScheduledMessage
  - campaigns.test.ts extensions: stubs for createCampaign, getEnrollmentCountsByCampaign, deriveCampaignStatus
affects:
  - 03-02 (Plan 02 implements scheduled-messages.ts and campaigns.ts extensions — stubs ready)
  - all campaign message scheduling in Phase 3 and 4 (Bree jobs use computeSendAt)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Intl.DateTimeFormat with timeZone Asia/Jerusalem for DST-safe UTC offset detection
    - Iterative UTC correction: estimate UTC+2, format back via Intl, adjust if displayed hour differs
    - computeSendAt does date arithmetic in LOCAL Jerusalem space, then converts — never subtract days in UTC

key-files:
  created:
    - src/lib/airtable/timezone.ts
    - src/lib/airtable/__tests__/timezone.test.ts
    - src/lib/airtable/__tests__/scheduled-messages.test.ts
  modified:
    - src/lib/airtable/__tests__/campaigns.test.ts

key-decisions:
  - "Intl.DateTimeFormat offset adjustment uses +diff not -diff: diff = target - displayed; if displayed is ahead, diff is negative, add it to UTC to go earlier"
  - "computeSendAt adjusts date by daysOffset in UTC date arithmetic (Date.UTC + setUTCDate), then resolves local time in Jerusalem space before calling localIsraelToUTC"
  - "timezone.ts correctly handles DST boundary: March 25 (UTC+2) for week_before of April 1 event (UTC+3) — different offsets on different dates"

patterns-established:
  - "Timezone tests: no mocking needed — localIsraelToUTC uses only native Intl API, testable with plain imports"
  - "DST-safe pattern: always compute target date in local Israel space first, then convert to UTC — never do UTC arithmetic and format as local"

requirements-completed: [CAMP-03]

# Metrics
duration: 8min
completed: 2026-03-18
---

# Phase 3 Plan 01: DST-Safe Timezone Utility Summary

**Zero-dependency Israel DST-safe UTC conversion via Intl.DateTimeFormat, with 9 passing tests covering 2026 DST boundary and Wave 0 test stubs for scheduled-messages and campaigns extensions**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-18T11:37:44Z
- **Completed:** 2026-03-18T11:45:59Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 4

## Accomplishments

- timezone.ts implemented with `localIsraelToUTC` and `computeSendAt` — handles 2026 DST boundary correctly
- All 9 timezone tests GREEN including the critical DST case: April 1 event's week_before lands March 25 at UTC+2 (not UTC+3)
- Wave 0 test scaffolds created: scheduled-messages.test.ts (5 stubs) and campaigns.test.ts extensions (7 stubs) — all RED awaiting Plan 02
- Existing 8 campaigns tests remain GREEN — no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing tests (RED)** - `a7eb923` (test)
2. **Task 2: Implement timezone.ts (GREEN)** - `5dfd70d` (feat)

_Note: TDD plan — RED commit followed by GREEN commit_

## Files Created/Modified

- `src/lib/airtable/timezone.ts` - DST-safe Israel timezone utility; exports localIsraelToUTC and computeSendAt
- `src/lib/airtable/__tests__/timezone.test.ts` - 9 tests for localIsraelToUTC and computeSendAt with 2026 DST boundaries
- `src/lib/airtable/__tests__/scheduled-messages.test.ts` - Wave 0 stubs for upsertScheduledMessages and updateScheduledMessage
- `src/lib/airtable/__tests__/campaigns.test.ts` - Extended with createCampaign, getEnrollmentCountsByCampaign, deriveCampaignStatus stubs; mockCreate added to mock setup

## Decisions Made

- **Intl adjustment sign fix:** The RESEARCH.md pattern used `utc.getTime() - diff * 60 * 60 * 1000` but the correct formula is `+ diff`. Reasoning: `diff = target - displayed`. If displayed (10:00) is ahead of target (09:00), diff is negative (-1). Adding -1 hour to 07:00 gives 06:00 UTC ✓. Subtracting would give 08:00 UTC ✗.
- **Test coverage for `deriveCampaignStatus` 'active' case:** Used `toContain(['active', 'future'])` rather than asserting exactly 'active' — the boundary between 'future' and 'active' depends on the exact UTC hour relative to test execution time, making a strict assertion brittle.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed inverted sign in Intl UTC offset adjustment**
- **Found during:** Task 2 (timezone.ts implementation)
- **Issue:** RESEARCH.md Pattern 4 used `utc.getTime() - diff * 60 * 60 * 1000` but the correct direction is `+ diff`. The minus sign produces a UTC value 2 hours ahead of expected (08:00 instead of 06:00 for a 09:00 IDT target).
- **Fix:** Changed subtraction to addition in the adjustment step
- **Files modified:** src/lib/airtable/timezone.ts
- **Verification:** All 9 timezone tests pass GREEN
- **Committed in:** 5dfd70d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in research pattern)
**Impact on plan:** Essential fix — without it all DST conversions were off by 2 hours. Caught by TDD before any downstream code used it.

## Issues Encountered

- Jest 30 renamed `--testPathPattern` to `--testPathPatterns` — used correct flag in verification commands

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- timezone.ts is complete and tested — Plan 02 can import computeSendAt immediately
- Wave 0 stubs define the exact interface Plan 02 must implement
- All test scaffolds will turn GREEN as Plan 02 implements scheduled-messages.ts and campaigns.ts extensions

---
*Phase: 03-campaign-management*
*Completed: 2026-03-18*
