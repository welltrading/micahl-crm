---
phase: 4
slug: scheduler-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30 + ts-jest 29 |
| **Config file** | `package.json` (jest key) |
| **Quick run command** | `npm test -- --testPathPattern="scheduler-services\|green-api"` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern="scheduler-services|green-api"`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| MSG-01 | 01 | 0 | MSG-01 | unit | `npm test -- --testPathPattern="scheduler-services.test"` | ❌ W0 | ⬜ pending |
| MSG-02 | 01 | 0 | MSG-02 | unit | `npm test -- --testPathPattern="scheduler-services.test"` | ❌ W0 | ⬜ pending |
| MSG-03 | 01 | 0 | MSG-03 | unit | `npm test -- --testPathPattern="phone.test"` | ✅ exists | ⬜ pending |
| MSG-04 | 02 | 0 | MSG-04 | unit | `npm test -- --testPathPattern="actions.test"` | ❌ W0 | ⬜ pending |
| INFRA-05 | 01 | 0 | INFRA-05 | unit (mocked) | `npm test -- --testPathPattern="green-api.test"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/airtable/__tests__/scheduler-services.test.ts` — stubs for MSG-01, MSG-02
- [ ] `src/lib/airtable/__tests__/green-api.test.ts` — stubs for INFRA-05 (mocked fetch)
- [ ] `src/app/kampanim/__tests__/broadcast.test.ts` — stubs for MSG-04

*MSG-03 phone normalization: existing `phone.test.ts` already covers `normalizePhone` — only `@c.us` append needs adding to existing file.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bree job fires every minute on Railway | INFRA-04 | Requires live Railway deployment | Deploy, wait 2 minutes, check Airtable for status changes |
| GREEN API sends real WhatsApp message | MSG-01 | Requires live GREEN API instance | Create pending message with past send_at, observe delivery |
| Broadcast sends to all enrolled contacts | MSG-04 | Requires live contacts + GREEN API | Enroll 2 contacts, trigger broadcast, verify both receive message |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
