---
phase: 04-scheduler-engine
plan: "01"
subsystem: scheduler-services
tags: [green-api, scheduler, airtable, tdd, whatsapp]
dependency_graph:
  requires: []
  provides: [green-api-client, scheduler-services, message-log]
  affects: [04-02, 04-03]
tech_stack:
  added: []
  patterns: [TDD-red-green, hebrew-airtable-fields, no-server-only-for-workers]
key_files:
  created:
    - src/lib/airtable/green-api.ts
    - src/lib/airtable/scheduler-services.ts
    - src/lib/airtable/message-log.ts
    - src/lib/airtable/__tests__/green-api.test.ts
    - src/lib/airtable/__tests__/scheduler-services.test.ts
    - src/app/kampanim/__tests__/broadcast.test.ts
  modified: []
decisions:
  - "broadcast.test.ts stubs are intentionally RED — broadcastAction implemented in plan 04-03"
  - "scheduler-services.ts uses relative imports and no server-only — Bree worker thread compatible"
  - "getPendingMessagesDue uses IS_BEFORE(field, NOW()) Airtable formula — no need to pass current time in filterByFormula"
metrics:
  duration_minutes: 4
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_changed: 6
---

# Phase 4 Plan 01: Scheduler Service Layer Summary

**One-liner:** GREEN API HTTP client and Airtable scheduler services (no server-only) with TDD test coverage and broadcast stub tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | GREEN API client + test | 40bef3c | green-api.ts, green-api.test.ts |
| 2 | Scheduler service layer + tests | d28118c | scheduler-services.ts, message-log.ts, scheduler-services.test.ts, broadcast.test.ts |

## What Was Built

### green-api.ts
- `sendWhatsAppMessage(chatId, message)` — POST to GREEN API sendMessage endpoint; throws with status code on non-OK response
- `getGreenApiState()` — GET getStateInstance; returns 'unknown' on any error (safe for health checks)
- No `server-only` import — runs in Bree worker threads and server actions

### scheduler-services.ts
Six Airtable functions for the scheduler loop:
- `getPendingMessagesDue(nowIso)` — queries with `AND({סטטוס} = 'ממתינה', IS_BEFORE({שליחה בשעה}, NOW()))`
- `markMessageSending(id)` — sets status to 'בשליחה' (idempotency lock)
- `markMessageSent(id)` — sets status to 'נשלחה' and records sent timestamp
- `markMessageFailed(id)` — sets status to 'נכשלה'
- `resetStuckSendingMessages()` — recovery on startup; resets 'בשליחה' back to 'ממתינה'
- `getEnrollmentsForCampaign(campaignId)` — FIND+ARRAYJOIN pattern for linked records

### message-log.ts
- `createMessageLogEntry(entry)` — creates audit record in MessageLog table with Hebrew field names and linked record arrays

### Test files
- `green-api.test.ts`: 4 tests, all GREEN — mocks `global.fetch` via `jest.spyOn`
- `scheduler-services.test.ts`: 10 tests, all GREEN — mocks `airtableBase` via `jest.mock('../client')`
- `broadcast.test.ts`: 3 stub tests, intentionally RED — `broadcastAction` is implemented in plan 04-03

## Test Results

```
Test Suites: 1 failed (broadcast stubs — expected), 9 passed, 10 total
Tests:       3 failed (broadcast stubs — expected), 90 passed, 93 total
```

All pre-existing tests remain GREEN. No regressions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] broadcast.test.ts required client mock to prevent env-var crash**
- **Found during:** Task 2 (broadcast test RED verification)
- **Issue:** `actions.ts` imports `campaigns.ts` which imports `client.ts` — client.ts throws at module init if `AIRTABLE_API_TOKEN` is not set in test env
- **Fix:** Added `jest.mock('@/lib/airtable/client', ...)` at top of broadcast.test.ts so client.ts never executes its env check
- **Files modified:** `src/app/kampanim/__tests__/broadcast.test.ts`
- **Commit:** d28118c

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/lib/airtable/green-api.ts | FOUND |
| src/lib/airtable/scheduler-services.ts | FOUND |
| src/lib/airtable/message-log.ts | FOUND |
| src/lib/airtable/__tests__/green-api.test.ts | FOUND |
| src/lib/airtable/__tests__/scheduler-services.test.ts | FOUND |
| src/app/kampanim/__tests__/broadcast.test.ts | FOUND |
| Commit 40bef3c | FOUND |
| Commit d28118c | FOUND |
