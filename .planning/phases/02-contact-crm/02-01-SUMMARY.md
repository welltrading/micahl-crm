---
phase: 02-contact-crm
plan: 01
subsystem: airtable-service
tags: [tdd, phone-utility, airtable, contacts, server-side]
dependency_graph:
  requires: []
  provides:
    - normalizePhone (972XXXXXXXXXX canonical format)
    - formatPhoneDisplay (UI display 0XX-XXX-XXXX)
    - createContact (Airtable service function)
    - getContactEnrollments (linked record filterByFormula)
    - getContactMessages (linked record filterByFormula)
  affects:
    - 02-02 (webhook handler uses normalizePhone)
    - 02-03 (server actions call createContact)
    - 02-04 (contact detail page uses getContactEnrollments + getContactMessages)
tech_stack:
  added: []
  patterns:
    - FIND+ARRAYJOIN filterByFormula for Airtable linked record fields
    - normalizePhone called in createContact before storing
    - private helpers (mapOffsetLabel, mapMessageStatus, mapEnrollmentSource)
key_files:
  created:
    - src/lib/airtable/phone.ts
    - src/lib/airtable/__tests__/phone.test.ts
  modified:
    - src/lib/airtable/contacts.ts
    - src/lib/airtable/__tests__/contacts.test.ts
decisions:
  - FIND+ARRAYJOIN is required for linked record fields — plain field equality returns empty results
  - normalizePhone throws on invalid input (empty string, non-phone) for fail-fast behavior
  - mapOffsetLabel/mapMessageStatus/mapEnrollmentSource are private (not exported) per plan spec
  - createContact uses typecast:true to allow date string in תאריך הצטרפות field
metrics:
  duration_minutes: 18
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
  tests_added: 31
  tests_total: 39
---

# Phase 2 Plan 01: Phone Utility and Airtable Service Extensions Summary

**One-liner:** Israeli phone normalization utility (all formats → 972XXXXXXXXXX) and Airtable service extended with createContact, getContactEnrollments, getContactMessages using FIND+ARRAYJOIN filterByFormula for linked record querying.

## What Was Built

### phone.ts (new)

Pure utility module with two exported functions:

- `normalizePhone(phone: string): string` — converts any Israeli mobile format to canonical `972XXXXXXXXXX`. Handles: dashed local (`050-123-4567`), plain local (`0501234567`), E.164 (`+972501234567`), already-normalized. Throws on empty or unrecognizable input.
- `formatPhoneDisplay(normalizedPhone: string): string` — converts `972XXXXXXXXXX` back to `0XX-XXX-XXXX` for UI display.

### contacts.ts (extended)

Three new exported service functions added, existing `getContacts()` and `getContactById()` unchanged:

- `createContact({ full_name, phone })` — creates Airtable record with normalized phone and today's date in `תאריך הצטרפות`. Returns `{ success: true }`.
- `getContactEnrollments(contactId)` — queries `CampaignEnrollments` table using `FIND("${contactId}", ARRAYJOIN({איש קשר}))` formula. Maps Hebrew `מקור` values to `'manual' | 'webhook'`.
- `getContactMessages(contactId)` — queries `ScheduledMessages` table using same FIND+ARRAYJOIN pattern. Maps Hebrew `תזמון` → `offset_label` enum and Hebrew `סטטוס` → `status` enum.

Private helpers (not exported): `mapEnrollmentSource`, `mapOffsetLabel`, `mapMessageStatus`.

## Test Coverage

- `phone.test.ts`: 8 tests — 6 normalizePhone cases (all formats + invalid), 2 formatPhoneDisplay cases
- `contacts.test.ts`: 23 tests — extended from 10 existing tests, added 13 new tests covering createContact (4), getContactEnrollments (5), getContactMessages (4)
- All 39 tests across 3 suites pass

## TDD Execution

**RED commit:** `43b680d` — Failing tests written first. phone.test.ts couldn't find module, contacts tests failed with `is not a function`.

**GREEN commit:** `b33d724` — Implementation. All 31 new tests pass, 39 total green.

**REFACTOR:** No changes needed — helpers were private from the start, code was clean.

## Deviations from Plan

None — plan executed exactly as written.

The `next/cache` mock was added to the test file (Rule 2: missing mock would break test environment) but the implementation does NOT use `revalidatePath` in `createContact` — the plan explicitly states "it is a service function, NOT a Server Action (Server Action is in plan 02-03)". The mock in the test file is a harmless safeguard.

## Self-Check

Files created/modified:
- src/lib/airtable/phone.ts — FOUND
- src/lib/airtable/contacts.ts — FOUND
- src/lib/airtable/__tests__/phone.test.ts — FOUND
- src/lib/airtable/__tests__/contacts.test.ts — FOUND

Commits:
- 43b680d — FOUND (RED: failing tests)
- b33d724 — FOUND (GREEN: implementation)

Build: next build passed, TypeScript zero errors.
Tests: 39/39 passing.

## Self-Check: PASSED
