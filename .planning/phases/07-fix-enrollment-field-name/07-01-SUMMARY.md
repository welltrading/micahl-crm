---
phase: 07-fix-enrollment-field-name
plan: "01"
subsystem: airtable-service
tags: [bug-fix, airtable, contacts, enrollments, tests]
dependency_graph:
  requires: []
  provides: [getContactEnrollments-correct, getEnrolledContactIds-correct]
  affects: [ContactDetailPanel, broadcastAction]
tech_stack:
  added: []
  patterns: [FIND+ARRAYJOIN-filterByFormula, _rawJson-createdTime-mock]
key_files:
  created: []
  modified:
    - src/lib/airtable/contacts.ts
    - src/lib/airtable/__tests__/contacts.test.ts
decisions:
  - "נרשמות table field linking contacts is named 'איש קשר' (not 'אשת קשר') — confirmed by cross-reference with getContactMessages and scheduler-services.ts CONTACT_FIELD constant"
  - "contacts.test.ts stale table assertions fixed for both נרשמות and הודעות מתוזמנות — English names were never valid"
metrics:
  duration: 5
  completed_date: "2026-03-22"
  tasks_completed: 2
  files_modified: 2
---

# Phase 7 Plan 01: Fix Enrollment Field Name Bug Summary

Fixed critical field name bug causing `getContactEnrollments` and `getEnrolledContactIds` to return empty arrays in production, plus aligned three stale test table name assertions.

## What Was Fixed

### contacts.ts — 4 field name fixes

All four occurrences of the wrong field name `אשת קשר` were replaced with the correct Airtable field name `איש קשר` in the `נרשמות` table:

1. `getContactEnrollments` — `filterByFormula` FIND+ARRAYJOIN query
2. `getContactEnrollments` — `contact_id` field read in `map()`
3. `getEnrolledContactIds` — `.select({ fields: [...] })` array
4. `getEnrolledContactIds` — field read in `for` loop

The table name `נרשמות` was not changed — it was already correct.

### contacts.test.ts — 3 mock fixes

1. `getContactById` mock missing `_rawJson: { createdTime: '...' }` — production reads `record._rawJson.createdTime`, mock would throw
2. `getContactEnrollments` table assertion: `'CampaignEnrollments'` → `'נרשמות'`
3. `getContactMessages` table assertion: `'ScheduledMessages'` → `'הודעות מתוזמנות'`

## Verification

```
PASS src/lib/airtable/__tests__/contacts.test.ts
Tests: 30 passed, 30 total
```

Zero occurrences of `אשת קשר` remain anywhere in `src/lib/airtable/`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed third stale table name assertion in contacts.test.ts**
- **Found during:** Task 2 — running tests after planned fixes
- **Issue:** `getContactMessages` test asserted `'ScheduledMessages'` but production calls `airtableBase('הודעות מתוזמנות')`. Test was failing.
- **Fix:** Changed assertion to `'הודעות מתוזמנות'`
- **Files modified:** `src/lib/airtable/__tests__/contacts.test.ts`
- **Commit:** 7042cdb

## Deferred Issues

Pre-existing test failures (out of scope — not caused by this plan):
- `src/lib/airtable/__tests__/campaigns.test.ts` — 4 failures: `_rawJson.createdTime` missing from mocks
- `src/lib/airtable/__tests__/scheduler-services.test.ts` — 4 failures: stale English table name assertions
- `src/lib/airtable/__tests__/message-log.test.ts` — 1 failure: stale English table name assertion

These were failing before this plan's changes and are not caused by this plan.

## Self-Check: PASSED

- `src/lib/airtable/contacts.ts` — modified, 0 occurrences of `אשת קשר`
- `src/lib/airtable/__tests__/contacts.test.ts` — modified, all 30 tests pass
- Commit e5969ab: Task 1 field name fixes
- Commit 7042cdb: Task 2 test mock fixes
