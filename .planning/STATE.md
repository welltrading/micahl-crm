---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 02-04 contact detail panel — human verification passed, phase 02 complete
last_updated: "2026-03-18T10:30:19.337Z"
last_activity: 2026-03-18 — 02-04 contact detail panel complete, human-verified
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 7
  completed_plans: 7
  percent: 14
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** מיכל יוצרת קמפיין לאירוע חדש בדקות — מגדירה תאריך ותוכן, והמערכת שולחת את כל הודעות הווצאפ בזמן הנכון לכל הנרשמות
**Current focus:** Phase 2 — Contact CRM

## Current Position

Phase: 2 of 6 (Contact CRM)
Plan: 4 of 4 in current phase (02-04 complete — phase done)
Status: Executing
Last activity: 2026-03-18 — 02-04 contact detail panel complete, human-verified

Progress: [█░░░░░░░░░] 14%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01-foundation P01 | 12 | 2 tasks | 10 files |
| Phase 01-foundation P02 | 15 | 2 tasks | 5 files |
| Phase 01-foundation P03 | 45 | 4 tasks | 12 files |
| Phase 02-contact-crm P02 | 3 | 1 tasks | 3 files |
| Phase 02-contact-crm P03 | 15 | 3 tasks | 6 files |
| Phase 02-contact-crm P04 | 5 | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Stack: Railway + Bree (not Vercel) — Vercel cron jitter makes "30 min before event" unreliable; Bree persistent process required
- Database: Airtable — Personal Access Token (50 req/sec), NOT OAuth (5 req/sec); Free plan 1,000 calls/month is insufficient — Team plan needed before launch
- WhatsApp: GREEN API v2 only — v1 deprecated March 2026
- RTL: shadcn/ui Jan 2026 release with `--rtl` flag; Tailwind 4 logical CSS properties (`ms-*`, `ps-*`)
- MAKE.com: Still sends webhook to add contacts — we receive it, not replace it
- [Phase 01-foundation]: Next.js 16.1.7 installed (latest stable, plan targeted 15) — no breaking changes for this project
- [Phase 01-foundation]: Tailwind 4 is config-file-free — CSS-first via @theme directives in globals.css
- [Phase 01-foundation]: .gitignore uses explicit .env.local exclusions (not .env*) to allow .env.local.example to be committed
- [Phase 01-foundation]: English table names for Airtable (API stability in URLs); Hebrew field display names only
- [Phase 01-foundation]: tsconfig.scripts.json with moduleResolution:node needed for Airtable SDK type compatibility (bundler resolution incompatible)
- [Phase 01-foundation]: Linked record fields require manual Airtable UI setup post-script (Meta API needs existing table IDs)
- [Phase 01-foundation]: RTL sidebar: plain flex with dir=rtl on html places sidebar right naturally — flex-row-reverse double-reverses and puts it left
- [Phase 01-foundation]: Hebrew forms: use feminine grammatical forms throughout (ברוכה הבאה) — Michal is female
- [Phase 02-contact-crm 02-01]: FIND+ARRAYJOIN is required for Airtable linked record filterByFormula — plain field equality returns empty results
- [Phase 02-contact-crm 02-01]: normalizePhone throws on invalid input for fail-fast behavior; createContact uses typecast:true for date fields
- [Phase 02-contact-crm 02-01]: mapOffsetLabel/mapMessageStatus/mapEnrollmentSource are private (not exported) — internal implementation detail of contacts.ts
- [Phase 02-contact-crm]: x-webhook-secret header auth over URL param keeps secret out of server logs
- [Phase 02-contact-crm]: No revalidatePath in webhook route — contacts page shows fresh on next user refresh per CONTEXT.md
- [Phase 02-contact-crm]: createContact takes object {full_name, phone} not positional args — plan had positional args; adapted to match 02-01 implementation
- [Phase 02-contact-crm]: force-dynamic on anshei-kesher page to ensure contacts always fresh after webhook additions
- [Phase 02-contact-crm]: createContact takes object {full_name, phone} not positional args — plan had positional args; adapted to match 02-01 implementation
- [Phase 02-contact-crm]: Phone display cells use dir=ltr to keep 050-123-4567 reading left-to-right inside RTL table
- [Phase 02-contact-crm]: selectedContact state wired in ContactsPageClient now so 02-04 detail panel requires no component refactor
- [Phase 02-contact-crm]: Lazy load on panel open via useEffect on contact?.id — no Airtable calls at page load, respects rate limits
- [Phase 02-contact-crm]: Cancelled fetch flag in useEffect cleanup prevents stale state on rapid contact switching
- [Phase 02-contact-crm]: Campaign ID shown as section header in detail panel — Phase 3 campaign lookup will enrich with campaign names
- [Phase 02-contact-crm]: Lazy load on panel open via useEffect on contact?.id — no Airtable calls at page load, respects rate limits
- [Phase 02-contact-crm]: Cancelled fetch flag in useEffect cleanup prevents stale state on rapid contact switching
- [Phase 02-contact-crm]: Campaign ID shown as section header in detail panel — Phase 3 campaign lookup will enrich with campaign names

### Pending Todos

None yet.

### Blockers/Concerns

- Airtable Free plan (1,000 calls/month) will be exhausted quickly — Team plan decision needed before Phase 4 ships
- GREEN API instance warm-up period for new instances is unconfirmed — verify with support before first production campaign
- Rav Messer CSV column names unknown — Phase 2 import handler may need a column-mapping step; confirm format before planning Phase 2

## Session Continuity

Last session: 2026-03-18T10:26:28.019Z
Stopped at: Completed 02-04 contact detail panel — human verification passed, phase 02 complete
Resume file: None
