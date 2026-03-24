---
phase: 10
slug: campaign-enrollees-tab
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x |
| **Config file** | jest.config.ts |
| **Quick run command** | `npm test -- --testPathPattern="campaigns"` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern="campaigns"`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | — | unit | `npm test -- --testPathPattern="campaigns"` | ✅ | ⬜ pending |
| 10-01-02 | 01 | 1 | — | unit | `npm test -- --testPathPattern="campaigns"` | ✅ | ⬜ pending |
| 10-02-01 | 02 | 2 | — | build | `npm run build` | ✅ | ⬜ pending |
| 10-02-02 | 02 | 2 | — | manual | visual inspection | — | ⬜ pending |
| 10-02-03 | 02 | 2 | — | manual | visual inspection | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| טאב נרשמות מציג שם/טלפון/אימייל/אישרה וואטסאפ | — | UI rendering requires browser | פתח קמפיין עם נרשמות, עבור לטאב נרשמות, ודא שהעמודות מוצגות |
| ביטול רישום מסיר שורה מהרשימה | — | UI state change requires browser | לחץ על ביטול רישום, ודא שהשורה נעלמת |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
