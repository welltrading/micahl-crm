---
phase: 03-campaign-management
plan: "05"
subsystem: scheduler-pipeline
tags: [airtable, scheduler, timezone, bug-fix, tdd]
dependency_graph:
  requires: [03-04]
  provides: [שליחה-בשעה-field-populated]
  affects: [bree-scheduler, scheduled-messages-service, campaign-actions]
tech_stack:
  added: []
  patterns: [localIsraelToUTC-in-all-write-paths, conditional-UTC-write]
key_files:
  created: []
  modified:
    - src/lib/airtable/scheduled-messages.ts
    - src/lib/airtable/__tests__/scheduled-messages.test.ts
    - src/app/kampanim/actions.ts
decisions:
  - "updateMessageTimeAction signature changed to (recordId, send_date, send_time) — callers pass Israel local values, not ISO UTC strings"
  - "שליחה בשעה omitted from updateScheduledMessage when only content/title updated (no date+time to compute UTC from)"
  - "console.log debug statements removed from upsertScheduledMessages production code"
metrics:
  duration: 15
  completed_date: "2026-03-19"
  tasks_completed: 2
  files_changed: 3
---

# Phase 03 Plan 05: UTC Scheduler Field Pipeline Fix Summary

**One-liner:** Wired `localIsraelToUTC` into all three ScheduledMessages write paths so the Bree scheduler's `IS_BEFORE({שליחה בשעה}, NOW())` filter actually triggers sends, and fixed `updateMessageTimeAction` data corruption that was writing ISO strings into an HH:MM field.

## What Was Built

Closed the critical gap between the UI save flow and the Bree scheduler. Previously, `שליחה בשעה` (the UTC DateTime field the scheduler queries) was never populated — meaning every message created through the CampaignSheet would silently fail to send. Now every write path computes and stores the correct UTC value.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Write שליחה בשעה in all scheduled-messages.ts write paths | 01ff1a3 | scheduled-messages.ts, scheduled-messages.test.ts |
| 2 | Fix updateMessageTimeAction data corruption bug | 9c04112 | actions.ts |

## Success Criteria Met

- [x] `שליחה בשעה` written in `upsertScheduledMessages` (both create and update paths)
- [x] `שליחה בשעה` written in `createScheduledMessage`
- [x] `שליחה בשעה` written in `updateScheduledMessage` when both `send_date` and `send_time` provided
- [x] `updateMessageTimeAction` no longer passes ISO string to `שעת שליחה`
- [x] Tests verify UTC value correctness: `2026-04-07 09:00 IDT → 2026-04-07T06:00:00.000Z`
- [x] All 11 scheduled-messages tests pass
- [x] TypeScript compiles without errors

## Deviations from Plan

None — plan executed exactly as written. The `localIsraelToUTC` import was not needed in actions.ts (UTC computation delegated to `updateScheduledMessage` as the plan noted), and no callers of `updateMessageTimeAction` existed requiring signature update.

## Key Decisions Made

1. **updateMessageTimeAction signature:** Changed from `(recordId, send_at: string)` to `(recordId, send_date: string, send_time: string)`. No callers existed in the codebase — clean signature change. Callers must now pass Israel local date and time separately.

2. **Conditional UTC write in updateScheduledMessage:** `שליחה בשעה` is only written when both `send_date` and `send_time` are provided. This is correct — without both values there is no basis for computing UTC.

3. **Console.log removal:** Three debug `console.log` statements removed from `upsertScheduledMessages` as production noise.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/lib/airtable/scheduled-messages.ts | FOUND |
| src/lib/airtable/__tests__/scheduled-messages.test.ts | FOUND |
| src/app/kampanim/actions.ts | FOUND |
| Commit 01ff1a3 | FOUND |
| Commit 9c04112 | FOUND |
