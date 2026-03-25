---
phase: 9
slug: dashboard-live-stats-cleanup
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-25
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x |
| **Config file** | jest.config.ts |
| **Quick run command** | `npm test -- --testPathPattern="message-log|campaigns"` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After Task 9-01-01:** Run `npm test -- --testPathPattern="message-log|campaigns"`
- **After Task 9-01-02:** Run `npm run build`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green + manual browser check (see Manual-Only section)
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | live-stats | unit | `npm test -- --testPathPattern="message-log|campaigns"` | ✅ | ⬜ pending |
| 9-01-02 | 01 | 1 | live-stats | build | `npm run build` | ✅ | ⬜ pending |
| 9-02-01 | 02 | 2 | dead-code | unit | `npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> **Note on 9-01-02:** `src/app/page.tsx` is a `force-dynamic` Next.js Server Component that calls live Airtable at request time. Meaningful unit tests would require a full Airtable mock infrastructure disproportionate to this polish phase. `npm run build` provides TypeScript type-safety verification; UI correctness is confirmed via the manual browser check below.

---

## Wave 0 Requirements

No Wave 0 test scaffolding required.

- `src/app/page.tsx` is a `force-dynamic` Server Component — build verification (`npm run build`) is the accepted automated check. UI correctness is verified manually.
- Service layer functions in `message-log.ts` and `campaigns.ts` are covered by the TDD task in Plan 01 (Task 1) which creates unit tests as part of implementation.

*All automated verify commands reference files that exist or are created within the same task.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stat cards show live counts in browser | live-stats | Requires live Airtable data | Run `npm run dev`, visit `/`, verify all 4 cards show numeric values not `"--"` |
| GREEN API badge displays colored dot | live-stats | Visual check | Confirm a colored dot (green/red/gray) appears next to "GREEN API" label |
| Campaign grid renders all campaigns | live-stats | Requires live Airtable data | Confirm each campaign row shows נרשמות, מתעניינות, and % המרה values |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify — no Wave 0 dependencies outstanding
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending execution
