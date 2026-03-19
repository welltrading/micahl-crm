---
phase: 5
slug: monitoring-error-ux
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30 + ts-jest |
| **Config file** | `package.json` (jest key) — preset: ts-jest, testEnvironment: node |
| **Quick run command** | `npx jest src/lib/airtable/__tests__/message-log.test.ts --no-coverage` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest src/lib/airtable/__tests__/message-log.test.ts --no-coverage`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 0 | MON-01 | unit stub | `npx jest src/lib/airtable/__tests__/message-log.test.ts --no-coverage` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | MON-01 | unit | `npx jest src/lib/airtable/__tests__/message-log.test.ts --no-coverage` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | MON-01 | unit | `npx jest src/lib/airtable/__tests__/message-log.test.ts --no-coverage` | ❌ W0 | ⬜ pending |
| 05-01-04 | 01 | 2 | MON-02 | manual (UI) | n/a | n/a | ⬜ pending |
| 05-01-05 | 01 | 2 | MON-03 | manual (UI) | n/a | n/a | ⬜ pending |
| 05-02-01 | 02 | 0 | UX-04 | unit stub | `npx jest src/lib/airtable/__tests__/message-log.test.ts --no-coverage` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | UX-04 | unit | `npx jest src/lib/airtable/__tests__/message-log.test.ts --no-coverage` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/airtable/__tests__/message-log.test.ts` — stubs for MON-01 (`getMessageLogByCampaign`, `getCampaignLogAction`) and UX-04 (`mapErrorToHebrew`)
- [ ] Airtable UI: add "Created time" field to MessageLog table (field name: `זמן יצירה`)
- [ ] Airtable UI: add lookup fields to MessageLog table for contact `שם מלא` and `טלפון` (or confirm they already exist)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "רק כשלונות" toggle filters to status=failed only | MON-02 | React UI state filter — no pure logic to unit test | Open campaign status tab, toggle "רק כשלונות", verify only failed entries shown |
| Banner renders when GREEN API disconnected | MON-03 | React render — requires browser UI | Disconnect GREEN API, open dashboard, verify Hebrew banner with action instruction appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
