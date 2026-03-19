---
phase: 6
slug: stats-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.3.0 + ts-jest 29.4.6 |
| **Config file** | package.json `jest` key |
| **Quick run command** | `npx jest --testPathPattern="contacts" --passWithNoTests` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="contacts" --passWithNoTests`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 0 | CONT-03 | unit | `npx jest --testPathPattern="contacts"` | ❌ W0 | ⬜ pending |
| 6-01-02 | 01 | 1 | CONT-03 | unit | `npx jest --testPathPattern="contacts"` | ✅ after W0 | ⬜ pending |
| 6-02-01 | 02 | 1 | CONT-03 | manual | Visual on mobile 375px viewport | N/A | ⬜ pending |
| 6-02-02 | 02 | 1 | CONT-03 | manual | Visual on mobile 375px viewport | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/airtable/__tests__/contacts.test.ts` — add `aggregateByMonth` unit tests (date range filter, month grouping, sort order, empty state, zero-row filtering)

*Existing infrastructure covers test framework — only test stubs need adding.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No horizontal scroll on contacts page mobile | CONT-03 | Visual CSS — no DOM assertion covers scroll state | Open Chrome DevTools, 375px width, scroll contacts page — confirm no horizontal scroll bar |
| No horizontal scroll on campaigns page mobile | CONT-03 | Visual CSS | Same as above on campaigns page |
| ContactDetailPanel readable on mobile | CONT-03 | Sheet width rendering — visual check | Open a contact detail, verify panel fits screen, text not clipped |
| RTL text readable in growth table | CONT-03 | Locale rendering | Verify Hebrew month names (ינואר 2026) appear correctly in table |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
