---
phase: 06-stats-polish
plan: 01
subsystem: contacts-ui
tags: [tdd, aggregation, growth-table, client-side, date-filter]
dependency_graph:
  requires: []
  provides: [aggregateByMonth, growth-table-ui]
  affects: [ContactsPageClient, contacts.test.ts]
tech_stack:
  added: []
  patterns: [useMemo-aggregation, exported-pure-function-for-testability, Intl.DateTimeFormat-he-IL]
key_files:
  created: []
  modified:
    - src/components/contacts/ContactsPageClient.tsx
    - src/lib/airtable/__tests__/contacts.test.ts
decisions:
  - "aggregateByMonth exported from ContactsPageClient (not a separate utility file) — keeps colocation with UI, test imports directly"
  - "Date range uses T00:00:00 for fromDate and T23:59:59 for toDate — inclusive boundary semantics"
  - "formatMonthLabel uses Intl.DateTimeFormat he-IL for locale-correct Hebrew month names (ינואר 2026 format)"
  - "Growth table inserted after stat cards, before search input — matches plan spec and CONTEXT.md layout order"
metrics:
  duration_minutes: 4
  completed_date: "2026-03-19"
  tasks_completed: 1
  files_modified: 2
requirements_satisfied: [CONT-03]
---

# Phase 6 Plan 01: Growth Table (aggregateByMonth) Summary

**One-liner:** Client-side month-by-month contact growth table with From/To date range filter, backed by exported `aggregateByMonth` pure function with 7 unit tests.

## What Was Built

- `aggregateByMonth(contacts, fromStr, toStr)` — exported pure function in `ContactsPageClient.tsx`. Groups contacts by `created_at` month, filters by optional date range, returns descending-sorted array of `{key, count}` with no zero-count rows.
- Growth table Card UI inserted after the 3 stat cards and before the search input. Displays Hebrew month names via `Intl.DateTimeFormat('he-IL')`, with From/To date pickers defaulting to last 3 months.
- Empty state message: "אין הצטרפויות בטווח התאריכים שנבחר" shown when no contacts fall in the selected range.
- Zero new Airtable API calls — all computation is client-side from the existing `contacts` prop.

## Test Results

- 7 new `aggregateByMonth` unit tests added to `contacts.test.ts` — all GREEN
- Full suite: 119 tests, 11 suites — all passing
- TypeScript: `npx tsc --noEmit` — no errors

## Key Implementation Decisions

1. **Export location:** `aggregateByMonth` lives in `ContactsPageClient.tsx` (exported), not a separate utility file. Keeps UI and logic colocated; tests import directly.
2. **Boundary semantics:** `fromDate` uses `T00:00:00` (start of day), `toDate` uses `T23:59:59` (end of day) — fully inclusive range.
3. **Month label format:** `Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' })` produces "ינואר 2026" format — no custom lookup table needed.
4. **TDD approach:** Tests committed in RED state first, implementation committed separately — clean TDD discipline.

## Files Modified

| File | Change |
|------|--------|
| `src/components/contacts/ContactsPageClient.tsx` | Added `aggregateByMonth`, `getDefaultFrom`, `getDefaultTo`, `formatMonthLabel` functions; added `fromStr`/`toStr` state, `growthData` useMemo, and growth table Card UI |
| `src/lib/airtable/__tests__/contacts.test.ts` | Appended `describe('aggregateByMonth')` block with 7 test cases |

## Commits

- `aa4c668` — `test(06-01): add failing aggregateByMonth tests (RED)`
- `a862036` — `feat(06-01): add aggregateByMonth function and growth table UI`

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- `src/components/contacts/ContactsPageClient.tsx` — FOUND
- `src/lib/airtable/__tests__/contacts.test.ts` — FOUND
- Commit `aa4c668` — FOUND
- Commit `a862036` — FOUND
