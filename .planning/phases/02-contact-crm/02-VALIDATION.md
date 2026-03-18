---
phase: 2
slug: contact-crm
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.3.0 + ts-jest |
| **Config file** | `package.json` (jest key) |
| **Quick run command** | `npm test -- --testPathPattern="(contacts|phone)"` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern="(contacts|phone)"`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 0 | CONT-01 | unit | `npm test -- --testPathPattern="phone"` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 0 | CONT-02 | unit | `npm test -- --testPathPattern="contacts"` | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 0 | INFRA-04 | unit | `npm test -- --testPathPattern="webhook"` | ❌ W0 | ⬜ pending |
| 2-01-04 | 01 | 0 | UX-01 | unit | `npm test -- --testPathPattern="actions"` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 1 | CONT-01 | unit | `npm test -- --testPathPattern="contacts"` | ✅ | ⬜ pending |
| 2-02-02 | 02 | 1 | CONT-01 | unit | `npm test -- --testPathPattern="phone"` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 1 | CONT-02 | unit | `npm test -- --testPathPattern="contacts"` | ❌ W0 | ⬜ pending |
| 2-04-01 | 04 | 1 | INFRA-04 | unit | `npm test -- --testPathPattern="webhook"` | ❌ W0 | ⬜ pending |
| 2-05-01 | 05 | 2 | CONT-03 | unit | `npm test -- --testPathPattern="contacts"` | ❌ W0 | ⬜ pending |
| 2-06-01 | 06 | 2 | UX-01 | unit | `npm test -- --testPathPattern="actions"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/airtable/phone.ts` — new phone utility (normalizePhone, formatPhoneDisplay)
- [ ] `src/lib/airtable/__tests__/phone.test.ts` — covers normalizePhone, formatPhoneDisplay (CONT-01, INFRA-04)
- [ ] `src/lib/airtable/__tests__/contacts.test.ts` — extend for getContactEnrollments, getContactMessages (CONT-02)
- [ ] `src/app/api/webhook/contact/__tests__/route.test.ts` — covers INFRA-04 webhook handler
- [ ] `src/app/anshei-kesher/__tests__/actions.test.ts` — covers addContact duplicate check (UX-01)
- [ ] `WEBHOOK_SECRET` in `.env.local` — needed for webhook tests and runtime

*All gaps must be resolved before Wave 1 begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Contact list shows in UI without opening Airtable | CONT-01 | Visual verification | Open /anshei-kesher, confirm table renders with name, phone, join date, campaign |
| Click contact → see message history per campaign | CONT-02 | UI interaction | Click a contact row, confirm side panel opens with enrollment + message history |
| MAKE.com webhook → contact appears within seconds | INFRA-04 | External system | Send POST to /api/webhook/contact with valid payload, refresh UI |
| Stats card shows correct monthly count | CONT-03 | Visual verification | Check stats card totals match Airtable records |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
