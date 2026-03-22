---
phase: 7
slug: fix-enrollment-field-name
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (existing) |
| **Config file** | `jest.config.ts` (project root) |
| **Quick run command** | `npm test -- --testPathPattern=contacts.test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern=contacts.test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 1 | CONT-02 | unit | `npm test -- --testPathPattern=contacts.test` | ✅ exists (needs fix) | ⬜ pending |
| 7-01-02 | 01 | 1 | CONT-02 | unit | `npm test -- --testPathPattern=contacts.test` | ✅ exists (needs fix) | ⬜ pending |
| 7-01-03 | 01 | 1 | CONT-02 | unit | `npm test -- --testPathPattern=contacts.test` | ✅ exists (needs fix) | ⬜ pending |
| 7-02-01 | 02 | 2 | CONT-02 | manual | Open contact, verify campaign heading shows name + date | N/A — UI | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The test file exists and only needs fixes to existing assertions — no new test files or framework setup required.

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Campaign name + date displayed in ContactDetailPanel instead of raw record ID | CONT-02 | UI rendering — no automated test for visual enrichment | Open a contact, expand the panel, verify enrollment headings show `{name} — {date}` format instead of `recXXXX` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
