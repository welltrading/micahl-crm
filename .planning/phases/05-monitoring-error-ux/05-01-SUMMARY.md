---
phase: 05-monitoring-error-ux
plan: 01
subsystem: message-log
tags: [airtable, message-log, error-mapping, server-action, tdd]
dependency_graph:
  requires: []
  provides: [getMessageLogByCampaign, mapErrorToHebrew, MessageLogDisplayEntry, getCampaignLogAction]
  affects: [05-03-campaign-sheet-log-tab]
tech_stack:
  added: []
  patterns: [FIND+ARRAYJOIN filterByFormula, _rawJson.createdTime, jest.spyOn for action tests]
key_files:
  created: [src/lib/airtable/__tests__/message-log.test.ts]
  modified: [src/lib/airtable/message-log.ts, src/app/kampanim/actions.ts]
decisions:
  - "jest.spyOn used instead of jest.mock for getCampaignLogAction tests — avoids module mock hoisting conflict with ../client mock"
  - "Client-side sort by logged_at instead of Airtable 'Created' sort field — avoids Airtable sort field name ambiguity in tests"
metrics:
  duration: 6
  completed_date: "2026-03-19"
  tasks_completed: 2
  files_changed: 3
---

# Phase 5 Plan 01: Message Log Data Layer Summary

**One-liner:** Message log read layer with FIND+ARRAYJOIN Airtable filter, Hebrew error mapper for 401/403/network codes, and thin getCampaignLogAction server action wrapper.

## What Was Built

Three exports added to the monitoring data layer:

- `MessageLogDisplayEntry` interface (exported type) — id, contact_id, full_name, phone, status, logged_at, error_message
- `getMessageLogByCampaign(campaignId)` — fetches MessageLog records filtered by campaign using FIND+ARRAYJOIN, maps Hebrew field names to typed entries, sorts by logged_at descending
- `mapErrorToHebrew(rawError)` — pure function mapping GREEN API error strings (401/notAuthorized, 403/not-registered, network/timeout, unknown) to friendly Hebrew messages
- `getCampaignLogAction(campaignId)` — server action in kampanim/actions.ts wrapping getMessageLogByCampaign, returns `{ entries }` or `{ error }`

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write failing tests (RED) | f419f68 | src/lib/airtable/__tests__/message-log.test.ts |
| 2 | Implement GREEN + TypeScript fix | 4a38ae0 | message-log.ts, actions.ts, message-log.test.ts |

## Test Results

- 19 tests pass: 10 getMessageLogByCampaign, 6 mapErrorToHebrew, 3 getCampaignLogAction
- Full suite: 112/112 tests pass (no regressions)
- TypeScript: `tsc --noEmit` clean

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed jest.mock conflict causing getMessageLogByCampaign tests to fail**
- **Found during:** Task 2 GREEN verification
- **Issue:** Original test structure used `jest.mock('../message-log', ...)` with `jest.requireActual` at bottom of test file. Jest hoists all `jest.mock` calls, causing the module-level mock to override the `../client` mock for `getMessageLogByCampaign` describe block. All 10 getMessageLogByCampaign tests returned `undefined` (mock stub instead of real function).
- **Fix:** Replaced `jest.mock('../message-log', ...)` with `jest.spyOn(require('../message-log'), 'getMessageLogByCampaign')` in the getCampaignLogAction describe block. This avoids hoisting conflicts and allows both describe blocks to work independently.
- **Files modified:** src/lib/airtable/__tests__/message-log.test.ts
- **Commit:** 4a38ae0

**2. [Rule 1 - Bug] Fixed import path for getCampaignLogAction**
- **Found during:** Task 1 RED verification
- **Issue:** Test file at `src/lib/airtable/__tests__/` used `../../app/kampanim/actions` (2 levels up) when actual path requires 3 levels up.
- **Fix:** Changed to `../../../app/kampanim/actions`
- **Files modified:** src/lib/airtable/__tests__/message-log.test.ts
- **Commit:** f419f68

**3. [Rule 2 - TypeScript] Fixed strict TS errors in test mock call access**
- **Found during:** Task 2 tsc --noEmit check
- **Issue:** `mockSelect.mock.calls[0][0]` caused TS2493 (tuple of length 0 has no element at index 0) and TS18048 (possibly undefined)
- **Fix:** Cast mock calls with `(mockSelect.mock.calls as any[][])[0]?.[0]` and use optional chaining on filterByFormula assertions
- **Files modified:** src/lib/airtable/__tests__/message-log.test.ts
- **Commit:** 4a38ae0

## Key Decisions

- **jest.spyOn pattern for action tests:** Avoids jest.mock hoisting that conflicts when test file also mocks `../client`. Pattern documented for 05-03 which will test similar action wrappers.
- **Client-side sort:** `getMessageLogByCampaign` fetches all records then sorts client-side by `logged_at` descending instead of using Airtable `sort: [{ field: 'Created', direction: 'desc' }]`. This avoids test brittleness from Airtable field name resolution and is noted in plan as fallback.
- **createMessageLogEntry unchanged:** Existing write function preserved exactly — only additions made to file.

## Self-Check: PASSED

All files verified present. Both task commits confirmed in git history.
