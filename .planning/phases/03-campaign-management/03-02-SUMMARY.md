---
phase: 03-campaign-management
plan: 02
subsystem: airtable-service
tags: [airtable, campaigns, scheduled-messages, tdd, jest, hebrew-fields]

# Dependency graph
requires:
  - phase: 03-campaign-management
    plan: 01
    provides: Wave 0 test stubs (campaigns.test.ts stubs, scheduled-messages.test.ts stubs)
provides:
  - createCampaign: writes campaign to Airtable with Hebrew field names, returns Campaign object with derived status
  - getEnrollmentCountsByCampaign: aggregates CampaignEnrollments by campaign ID
  - deriveCampaignStatus: pure function computing future/active/ended from event_date vs now
  - getCampaigns/getCampaignById updated to use deriveCampaignStatus (no longer reads סטטוס from Airtable)
  - getScheduledMessagesByCampaign: fetches messages by campaign using FIND+ARRAYJOIN filterByFormula
  - upsertScheduledMessages: creates Airtable ScheduledMessages records for filled slots, wraps campaignId in array
  - updateScheduledMessage: patches Hebrew field names for partial record update
affects:
  - 03-03 (UI layer — campaigns page and create modal depend on createCampaign, getCampaigns, getEnrollmentCountsByCampaign)
  - 03-04 (CampaignSheet — depends on getScheduledMessagesByCampaign, upsertScheduledMessages, updateScheduledMessage)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - deriveCampaignStatus uses new Date() at call time — status always fresh, never stale
    - createCampaign uses single-record Airtable create (not batch) to match test mock expectations
    - upsertScheduledMessages filters empty slots before batch create, wraps campaignId in array for linked records
    - FIND+ARRAYJOIN filterByFormula for linked record lookups (established Phase 2 pattern, reused here)

key-files:
  created:
    - src/lib/airtable/scheduled-messages.ts
  modified:
    - src/lib/airtable/campaigns.ts

key-decisions:
  - "createCampaign uses single-record create (no typecast option) — test stubs from Plan 01 mock single-record API; typecast unnecessary since event_date is passed as ISO8601 string"
  - "getCampaigns and getCampaignById updated to use deriveCampaignStatus — removes reliance on Airtable סטטוס field which was not reliably kept in sync"
  - "deriveCampaignStatus exported from campaigns.ts — used in tests directly and available to UI layer if needed"

# Metrics
duration: 5min
completed: 2026-03-18
---

# Phase 3 Plan 02: Airtable Service Layer for Campaign Management Summary

**TDD GREEN pass: campaigns.ts extended with createCampaign, getEnrollmentCountsByCampaign, deriveCampaignStatus; scheduled-messages.ts created with getScheduledMessagesByCampaign, upsertScheduledMessages, updateScheduledMessage — all 20 Wave 0 stubs now GREEN, full suite 72/72**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-18T~11:46Z
- **Completed:** 2026-03-18
- **Tasks:** 2 (TDD GREEN for both)
- **Files modified:** 2

## Accomplishments

- campaigns.ts: added `deriveCampaignStatus()`, `createCampaign()`, `getEnrollmentCountsByCampaign()`; updated `getCampaigns()` and `getCampaignById()` to compute status at read time instead of reading from Airtable
- scheduled-messages.ts: created from scratch with `getScheduledMessagesByCampaign()`, `upsertScheduledMessages()`, `updateScheduledMessage()` and `SlotData` interface
- All 15 campaigns.test.ts tests GREEN (8 existing + 7 new Wave 0 stubs)
- All 5 scheduled-messages.test.ts tests GREEN
- Full suite: 72/72 tests pass — no regressions in Phase 2 (contacts, phone) or Phase 3 Plan 01 (timezone) tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend campaigns.ts** - `510d322` (feat)
2. **Task 2: Create scheduled-messages.ts** - `dd23727` (feat)

## Files Created/Modified

- `src/lib/airtable/campaigns.ts` - Added deriveCampaignStatus, createCampaign, getEnrollmentCountsByCampaign; updated getCampaigns and getCampaignById to use deriveCampaignStatus
- `src/lib/airtable/scheduled-messages.ts` - New service file: getScheduledMessagesByCampaign, upsertScheduledMessages, updateScheduledMessage, SlotData interface

## Decisions Made

- **createCampaign uses single-record API (no typecast option):** The Wave 0 test stubs (from Plan 01) mock the Airtable create function expecting a single plain-object call. The plan referenced typecast but the test spec does not accommodate a second options argument. Since event_date is passed as ISO8601 string, typecast is not needed. Test spec takes precedence over plan prose.

- **getCampaigns/getCampaignById no longer read 'סטטוס' from Airtable:** Status is now computed via `deriveCampaignStatus(event_date)` at read time. This is the correct behavior per the plan's must_haves: "getCampaigns() calls deriveCampaignStatus() so status is always computed fresh (not read from Airtable)".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed typecast option from createCampaign to match test expectations**
- **Found during:** Task 1 (first test run)
- **Issue:** Plan specified `{ typecast: true }` as second arg to `create()`, but the Wave 0 test stub uses `toHaveBeenCalledWith(expect.objectContaining({...}))` which checks all arguments. Two-argument call fails a one-argument expectation.
- **Fix:** Removed `{ typecast: true }` second argument — not needed since event_date arrives as ISO8601 string
- **Files modified:** src/lib/airtable/campaigns.ts
- **Verification:** All 15 campaigns tests GREEN on second run

---

**Total deviations:** 1 auto-fixed (Rule 1 — removed typecast option to match test expectations)
**Impact on plan:** Zero functional impact — typecast was precautionary; ISO8601 strings don't need it

## Issues Encountered

None beyond the one auto-fixed deviation above.

## User Setup Required

None.

## Next Phase Readiness

- campaigns.ts fully implements all exports required by Plan 03/04 UI layer
- scheduled-messages.ts ready for actions.ts (Plan 03) to import
- All service functions tested with mocked Airtable — safe to build UI on top
