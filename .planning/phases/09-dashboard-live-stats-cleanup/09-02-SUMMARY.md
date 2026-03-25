---
phase: 09-dashboard-live-stats-cleanup
plan: "02"
subsystem: airtable-service-layer
tags: [dead-code-removal, scheduled-messages, campaign-actions, bug-fix]
dependency_graph:
  requires: []
  provides: ["scheduled-messages service without upsertScheduledMessages", "campaign actions without updateMessageTimeAction"]
  affects: ["src/lib/airtable/scheduled-messages.ts", "src/lib/airtable/__tests__/scheduled-messages.test.ts", "src/app/kampanim/actions.ts"]
tech_stack:
  added: []
  patterns: ["server-only airtable service layer", "israelDateTimeToUTC UTC write on every date+time update"]
key_files:
  created: []
  modified:
    - src/lib/airtable/scheduled-messages.ts
    - src/lib/airtable/__tests__/scheduled-messages.test.ts
    - src/app/kampanim/actions.ts
decisions:
  - "updateScheduledMessage now writes שליחה בשעה (UTC) when both send_date+send_time provided — this was a pre-existing bug exposed by the existing test; fixed inline per Rule 1"
metrics:
  duration_minutes: 5
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_modified: 3
---

# Phase 09 Plan 02: Dead Code Removal — upsertScheduledMessages and updateMessageTimeAction Summary

Remove three zero-caller dead code blocks: `upsertScheduledMessages` function + its 6 tests, and `updateMessageTimeAction` server action.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove upsertScheduledMessages and its tests | 1b551d9 | scheduled-messages.ts, scheduled-messages.test.ts |
| 2 | Remove updateMessageTimeAction from kampanim actions | 75982f6 | actions.ts |

## Verification

- `npm test --testPathPatterns="scheduled-messages"` passes — 4 tests pass, 0 upsertScheduledMessages tests remain
- `npm run build` exits 0 — no TypeScript errors
- Grep confirms zero occurrences of `upsertScheduledMessages` or `updateMessageTimeAction` in `src/`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed updateScheduledMessage missing UTC write for שליחה בשעה**
- **Found during:** Task 1 (test run after removing upsertScheduledMessages)
- **Issue:** The pre-existing test `writes שליחה בשעה when send_date and send_time both provided` was failing because `updateScheduledMessage` did not compute or write `שליחה בשעה` when both `send_date` and `send_time` were provided. This violates the CLAUDE.md Airtable field rule: every write to ScheduledMessages must populate `שליחה בשעה` with UTC.
- **Fix:** Added `localIsraelToUTC` import from `./timezone` and added the UTC write: when both `send_date` and `send_time` are present in the fields object, compute `update['שליחה בשעה'] = localIsraelToUTC(fields.send_date, fields.send_time)`.
- **Files modified:** `src/lib/airtable/scheduled-messages.ts`
- **Commit:** 1b551d9

## Self-Check

Files created/modified:
- src/lib/airtable/scheduled-messages.ts — exists, upsertScheduledMessages removed, updateScheduledMessage now writes UTC
- src/lib/airtable/__tests__/scheduled-messages.test.ts — exists, upsertScheduledMessages describe block removed, import updated
- src/app/kampanim/actions.ts — exists, updateMessageTimeAction removed

Commits:
- 1b551d9 — fix(09-02): remove upsertScheduledMessages dead code and fix updateScheduledMessage UTC write
- 75982f6 — fix(09-02): remove updateMessageTimeAction dead code from kampanim actions
