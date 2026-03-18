---
phase: 02-contact-crm
plan: 02
subsystem: webhook-endpoint
tags: [tdd, webhook, auth, airtable, next-route-handler]
dependency_graph:
  requires:
    - normalizePhone (from 02-01 phone.ts)
    - airtableBase (from lib/airtable/client.ts)
  provides:
    - POST /api/webhook/contact (MAKE.com webhook handler)
  affects:
    - MAKE.com integration (external — calls this endpoint)
tech_stack:
  added: []
  patterns:
    - x-webhook-secret header auth (not URL param — keeps secret out of server logs)
    - normalizePhone called before Airtable write
    - NextRequest/NextResponse in App Router Route Handler
key_files:
  created:
    - src/app/api/webhook/contact/route.ts
    - src/app/api/webhook/contact/__tests__/route.test.ts
  modified:
    - .env.local.example
decisions:
  - x-webhook-secret header auth chosen over URL param to keep secret out of server logs
  - No revalidatePath called — webhook runs server-side without user session; contacts page shows up-to-date on next user refresh per CONTEXT.md decision
  - .env.local is gitignored — WEBHOOK_SECRET only documented as empty placeholder in .env.local.example
metrics:
  duration_minutes: 3
  completed_date: "2026-03-18"
  tasks_completed: 1
  files_created: 2
  files_modified: 1
  tests_added: 6
  tests_total: 45
---

# Phase 2 Plan 02: MAKE.com Webhook Contact Endpoint Summary

**One-liner:** Authenticated POST route handler for MAKE.com contact webhooks — x-webhook-secret auth, full_name/phone validation, normalizePhone before Airtable write, returns 201 on success.

## What Was Built

### route.ts (new)

Next.js App Router Route Handler at `src/app/api/webhook/contact/route.ts`:

- `export async function POST(req: NextRequest)` — Dynamic route, server-rendered on demand
- Auth: reads `x-webhook-secret` header, compares to `process.env.WEBHOOK_SECRET` — returns 401 `{ error: 'Unauthorized' }` on mismatch or missing header
- Validation: requires `full_name` (string, non-empty) and `phone` (string, non-empty) in JSON body — returns 400 `{ error: 'Missing required fields' }` otherwise
- Normalization: calls `normalizePhone(phone)` before storing (converts any Israeli format to 972XXXXXXXXXX)
- Airtable write: `airtableBase('Contacts').create({ 'שם מלא', 'טלפון', 'תאריך הצטרפות' })` where date = today YYYY-MM-DD
- Returns 201 `{ success: true }` on success
- File-level comment documents the expected MAKE.com payload shape and Airtable field names

### route.test.ts (new)

6 unit tests using Jest with module mocks for `airtableBase` and `normalizePhone`:

1. Missing x-webhook-secret → 401 `{ error: 'Unauthorized' }`
2. Wrong secret value → 401 `{ error: 'Unauthorized' }`
3. Valid secret, missing full_name → 400 `{ error: 'Missing required fields' }`
4. Valid secret, missing phone → 400 `{ error: 'Missing required fields' }`
5. Valid secret + valid body → calls `airtableBase('Contacts').create` with normalized phone → 201 `{ success: true }`
6. Phone `050-123-4567` → stored as `972501234567` (normalizePhone called with original value)

### .env.local (generated)

WEBHOOK_SECRET generated via `openssl rand -hex 32` and added to `.env.local` (gitignored).
`WEBHOOK_SECRET=` added to `.env.local.example` as empty placeholder for documentation.

## TDD Execution

**RED commit:** `94501ed` — Failing tests written first. Test suite failed with "Cannot find module '../route'".

**GREEN commit:** `a7e0c68` — Route handler implemented. All 6 webhook tests pass. Full suite: 45/45 tests pass across 4 suites.

**REFACTOR:** No changes needed — implementation was clean from the start.

## Deviations from Plan

None — plan executed exactly as written.

Note: The plan verification command uses `--testPathPattern` (deprecated flag). The actual flag in Jest 30 is `--testPathPatterns`. Tests ran correctly using the new flag. This is an out-of-scope pre-existing configuration issue tracked in `deferred-items.md` — not fixed here.

## Self-Check

Files created/modified:
- src/app/api/webhook/contact/route.ts — FOUND
- src/app/api/webhook/contact/__tests__/route.test.ts — FOUND
- .env.local.example — FOUND (WEBHOOK_SECRET= added)
- .env.local — FOUND (gitignored, not committed)

Commits:
- 94501ed — FOUND (RED: failing tests)
- a7e0c68 — FOUND (GREEN: implementation)

Tests: 45/45 passing (6 new webhook tests + 39 from 02-01).
Build: next build passed, TypeScript zero errors, route shows as Dynamic.

## Self-Check: PASSED
