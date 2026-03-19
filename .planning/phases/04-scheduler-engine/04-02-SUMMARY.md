---
phase: 04-scheduler-engine
plan: "02"
subsystem: scheduler
tags: [bree, scheduler, whatsapp, idempotency, typescript-build]
dependency_graph:
  requires: [04-01]
  provides: [scheduler-compile, send-messages-job, bree-registration]
  affects: [railway-deployment]
tech_stack:
  added: []
  patterns: [bree-worker-thread, idempotency-lock, per-contact-fanout, boot-recovery]
key_files:
  created:
    - tsconfig.scheduler.json
    - src/scheduler/jobs/send-messages.ts
  modified:
    - src/scheduler/index.ts
    - railway.toml
    - package.json
    - src/lib/airtable/message-log.ts
decisions:
  - tsconfig.scheduler.json uses module:commonjs + explicit .ts globs (not /**) for TypeScript include paths
  - markMessageSent called after all enrollments processed; individual contact failures logged in MessageLog without failing the parent message
  - 500ms delay between sends per contact to respect GREEN API rate limits
  - Boot recovery via resetStuckSendingMessages() before bree.start() prevents double-sending on crash restart
metrics:
  duration_minutes: 3
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_changed: 6
---

# Phase 4 Plan 02: Bree Scheduler Wiring Summary

Bree registered with send-messages job at 1-minute interval; TypeScript compiles to dist/ via dedicated tsconfig.scheduler.json; Railway points to compiled output.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | tsconfig.scheduler.json + fix build:scheduler script | d1cd803 | tsconfig.scheduler.json, package.json, message-log.ts |
| 2 | send-messages job + Bree registration + railway.toml update | 089fc8e | src/scheduler/jobs/send-messages.ts, src/scheduler/index.ts, railway.toml |

## What Was Built

### tsconfig.scheduler.json
A dedicated TypeScript config for scheduler compilation — module:commonjs, outDir:dist, rootDir:src. The main tsconfig.json has noEmit:true which prevented build output; this config bypasses that constraint. Include paths use explicit `**/*.ts` globs (bare `**` suffix causes TS5010 error).

### send-messages.ts (Bree worker thread)
Full idempotent send loop:
1. Fetch messages with status 'ממתינה' whose send_at < NOW()
2. `markMessageSending(msg.id)` — claims the message (status → 'בשליחה') before any send; concurrent ticks skip it
3. `getEnrollmentsForCampaign()` — fan-out to all enrolled contacts
4. For each contact: normalize phone → `@c.us` suffix → `sendWhatsAppMessage()` → `createMessageLogEntry()`
5. 500ms delay between contacts for GREEN API rate limiting
6. `markMessageSent()` after all contacts processed

Error cases handled: missing campaign_id, contact not found, invalid phone, GREEN API throw — all logged to MessageLog with status:'failed', do not abort the loop.

### src/scheduler/index.ts
Replaced placeholder with `main()` async function:
- `resetStuckSendingMessages()` on boot (crash recovery: clears 'בשליחה' back to 'ממתינה')
- Bree instance with `{ name: 'send-messages', interval: '1m' }` registered
- `bree.start()` awaited

### railway.toml + package.json
- railway.toml scheduler service: `startCommand = "node dist/scheduler/index.js"`
- package.json `build:scheduler`: `tsc --project tsconfig.scheduler.json`
- package.json `scheduler` and new `scheduler:prod`: `node dist/scheduler/index.js`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TypeScript include glob syntax**
- **Found during:** Task 1
- **Issue:** TypeScript include paths `src/scheduler/**` (bare wildcard) caused TS5010 error "File specification cannot end in a recursive directory wildcard"
- **Fix:** Changed to `src/scheduler/**/*.ts` and `src/lib/airtable/**/*.ts`
- **Files modified:** tsconfig.scheduler.json
- **Commit:** d1cd803

**2. [Rule 1 - Bug] Fixed message-log.ts Airtable FieldSet type incompatibility**
- **Found during:** Task 1 (build revealed error TS2769)
- **Issue:** `Record<string, unknown>` was not assignable to `Partial<FieldSet>` parameter of airtable `create()` overload
- **Fix:** Changed field map type to `Record<string, any>` with eslint-disable comment
- **Files modified:** src/lib/airtable/message-log.ts
- **Commit:** d1cd803

## Verification Results

- `npm run build:scheduler` exits 0, produces dist/scheduler/index.js and dist/scheduler/jobs/send-messages.js
- Full test suite: 90/93 tests pass (3 failures are intentionally RED broadcast.test.ts stubs — scheduled for plan 04-03)
- railway.toml contains `startCommand = "node dist/scheduler/index.js"`
- send-messages.ts uses only relative imports (no @/ aliases)

## Self-Check: PASSED

All created files exist on disk. Both task commits verified in git log.
