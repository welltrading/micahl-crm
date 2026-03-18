---
phase: 3
slug: campaign-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.3.0 + ts-jest 29.4.6 |
| **Config file** | `package.json` (jest key), `tsconfig.json` |
| **Quick run command** | `npm test -- --testPathPattern="campaigns\|scheduled-messages\|timezone"` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern="campaigns\|scheduled-messages\|timezone"`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | CAMP-02, CAMP-06 | unit | `npm test -- --testPathPattern="scheduled-messages.test"` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 0 | CAMP-03 | unit | `npm test -- --testPathPattern="timezone.test"` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 0 | CAMP-01, CAMP-04, CAMP-05 | unit | `npm test -- --testPathPattern="campaigns.test"` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | CAMP-03 | unit | `npm test -- --testPathPattern="timezone.test"` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 1 | CAMP-01 | unit | `npm test -- --testPathPattern="campaigns.test"` | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 1 | CAMP-02 | unit | `npm test -- --testPathPattern="scheduled-messages.test"` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 1 | UX-02 | manual | visual review in browser | manual-only | ⬜ pending |
| 3-04-01 | 04 | 1 | CAMP-04, CAMP-05 | unit | `npm test -- --testPathPattern="campaigns.test"` | ❌ W0 | ⬜ pending |
| 3-05-01 | 05 | 2 | CAMP-06 | unit | `npm test -- --testPathPattern="scheduled-messages.test"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/airtable/__tests__/scheduled-messages.test.ts` — stubs for CAMP-02, CAMP-06
- [ ] `src/lib/airtable/__tests__/timezone.test.ts` — covers CAMP-03 with DST edge cases (Israel UTC+2/UTC+3, 2026 transitions)
- [ ] `src/lib/airtable/__tests__/campaigns.test.ts` — extend existing file with `createCampaign`, `getEnrollmentCountsByCampaign`, and `deriveCampaignStatus` test cases for CAMP-01, CAMP-04, CAMP-05

*Existing `campaigns.test.ts` covers `getCampaigns` basics — Wave 0 extends it, does not replace it.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Date picker renders correctly in Hebrew RTL, visual date selection works | UX-02 | UI/visual behavior — no DOM assertion covers RTL calendar rendering | Open create-campaign modal, verify Hebrew labels, click date picker, select date, confirm preview updates live |
| Time select dropdown shows correct computed send_at in Jerusalem timezone | UX-02 | Live timezone preview requires running app context | Select each time offset option, verify the displayed send_at matches expected Jerusalem time |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
