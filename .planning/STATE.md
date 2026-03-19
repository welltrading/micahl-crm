---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Completed 03-06-PLAN.md (CAMP-02/UX-02 design decision — option A accepted)
last_updated: "2026-03-19T21:28:36.351Z"
last_activity: 2026-03-19 — 05-03 יומן שליחות log tab with failures toggle complete (user approved)
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 22
  completed_plans: 22
  percent: 94
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** מיכל יוצרת קמפיין לאירוע חדש בדקות — מגדירה תאריך ותוכן, והמערכת שולחת את כל הודעות הווצאפ בזמן הנכון לכל הנרשמות
**Current focus:** Phase 3 — Campaign Management

## Current Position

Phase: 5 of 6 (Monitoring + Error UX) — COMPLETE
Plan: 3 of 3 in current phase (05-03 complete — יומן שליחות tab in CampaignSheet)
Status: Phase 5 complete — ready for Phase 6
Last activity: 2026-03-19 — 05-03 יומן שליחות log tab with failures toggle complete (user approved)

Progress: [█████████░] 94%

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
| Phase 03-campaign-management P01 | 8 | 2 tasks | 4 files |
| Phase 03-campaign-management P02 | 5 | 2 tasks | 2 files |
| Phase 03-campaign-management P03 | 10 | 2 tasks | 5 files |
| Phase 04-scheduler-engine P01 | 4 | 2 tasks | 6 files |
| Phase 04-scheduler-engine P02 | 3 | 2 tasks | 6 files |
| Phase 04-scheduler-engine P03 | 8 | 2 tasks | 2 files |
| Phase 04-scheduler-engine P04 | 2 | 1 tasks | 1 files |
| Phase 05-monitoring-error-ux P01 | 6 | 2 tasks | 3 files |
| Phase 05-monitoring-error-ux P03 | 8 | 2 tasks | 1 files |
| Phase 05-monitoring-error-ux P03 | 15 | 3 tasks | 1 files |
| Phase 06-stats-polish P01 | 4 | 1 tasks | 2 files |
| Phase 06-stats-polish P02 | 10 | 2 tasks | 3 files |
| Phase 03-campaign-management P04 | 25 | 2 tasks | 6 files |
| Phase 03-campaign-management P05 | 15 | 2 tasks | 3 files |
| Phase 03-campaign-management P06 | 15 | 2 tasks | 5 files |

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
- [Phase 03-campaign-management]: Intl.DateTimeFormat offset adjustment uses +diff (not -diff): diff=target-displayed; if displayed is ahead diff is negative; adding it to UTC gives correct earlier time
- [Phase 03-campaign-management]: computeSendAt adjusts date in UTC arithmetic then resolves local Jerusalem time before calling localIsraelToUTC — never UTC day subtraction then local format
- [Phase 03-campaign-management]: DST boundary verified: March 25 (UTC+2) for week_before of April 1 event (UTC+3) — different offset on different dates handled correctly
- [Phase 03-campaign-management]: createCampaign uses single-record create API (no typecast) — Wave 0 test stubs expect single plain-object call; ISO8601 dates don't need typecast
- [Phase 03-campaign-management]: getCampaigns/getCampaignById no longer read 'סטטוס' from Airtable — status computed via deriveCampaignStatus at read time, always fresh
- [Phase 03-campaign-management]: Native <input type="date"> for date selection — @base-ui/react v1.3.0 has no Calendar component (confirmed by Research.md)
- [Phase 03-campaign-management]: selectedCampaign state wired in CampaignsPageClient now — Plan 04 CampaignSheet requires no component refactor
- [Phase 04-scheduler-engine]: broadcast.test.ts stubs are intentionally RED — broadcastAction implemented in plan 04-03
- [Phase 04-scheduler-engine]: scheduler-services.ts uses relative imports and no server-only — Bree worker thread compatible
- [Phase 04-scheduler-engine]: tsconfig.scheduler.json uses module:commonjs + explicit .ts globs for include paths
- [Phase 04-scheduler-engine]: markMessageSent called after all enrollments processed; individual contact failures logged in MessageLog without failing parent message
- [Phase 04-scheduler-engine]: Boot recovery via resetStuckSendingMessages() before bree.start() prevents double-sending on crash restart
- [Phase 04-scheduler-engine]: broadcastAction uses 1s delay (vs 500ms minimum) for GREEN API safety margin — partial failures logged in failed counter without aborting remaining sends
- [Phase 04-scheduler-engine]: Two-step confirmation inline amber box prevents accidental mass sends — shows enrollment count before confirming
- [Phase 04-scheduler-engine]: force-dynamic on hagdarot page ensures GREEN API status is always fetched live, not cached at build time
- [Phase 04-scheduler-engine]: Three-state GREEN API badge (green/red/gray) — gray for unknown covers missing env vars and network errors with actionable Hebrew guidance
- [Phase 05-monitoring-error-ux]: jest.spyOn for action tests avoids jest.mock hoisting conflict with ../client mock
- [Phase 05-monitoring-error-ux]: getMessageLogByCampaign sorts client-side by logged_at — avoids Airtable sort field name ambiguity
- [Phase 05-monitoring-error-ux]: GREEN API banner only shown for 'notAuthorized' — 'unknown' (missing env vars / network error) is silent to avoid dev noise; banner is persistent/non-dismissible
- [Phase 05-monitoring-error-ux]: CampaignSheet log tab lazy-loads on first tab open only (activeTab === log && logEntries === null), cancelled-fetch flag prevents stale state
- [Phase 05-monitoring-error-ux]: CampaignSheet log tab lazy-loads on first tab open only (activeTab === log && logEntries === null), cancelled-fetch flag prevents stale state
- [Phase 06-stats-polish]: aggregateByMonth exported from ContactsPageClient for colocation and direct test import
- [Phase 06-stats-polish]: layout.tsx main uses p-4 md:p-6 — single-source page padding eliminates double-padding on mobile
- [Phase 06-stats-polish]: ContactDetailPanel SheetContent uses w-full sm:max-w-md overflow-y-auto, matching CampaignSheet width pattern
- [Phase 03-campaign-management]: Flexible slots with date/time per slot instead of fixed offset labels — user has full control over send timing
- [Phase 03-campaign-management]: timezone-client.ts: client-safe Intl.DateTimeFormat wrapper for browser live preview — server-only computeSendAt not importable from client
- [Phase 03-campaign-management]: Per-slot save buttons (not global save) — prevents overwriting unsaved sibling slots, clearer UX
- [Phase 03-campaign-management]: updateMessageTimeAction signature changed to (recordId, send_date, send_time) — callers pass Israel local values not ISO UTC strings
- [Phase 03-campaign-management]: שליחה בשעה omitted from updateScheduledMessage when only content/title updated — no date+time to compute UTC from
- [Phase 03-campaign-management]: CAMP-02/UX-02 design deviation accepted by Michal — flexible date pickers satisfy requirement intent per product owner decision (2026-03-19)

### Pending Todos

None yet.

### Blockers/Concerns

- Airtable Free plan (1,000 calls/month) will be exhausted quickly — Team plan decision needed before Phase 4 ships
- GREEN API instance warm-up period for new instances is unconfirmed — verify with support before first production campaign
- Rav Messer CSV column names unknown — Phase 2 import handler may need a column-mapping step; confirm format before planning Phase 2

## Session Continuity

Last session: 2026-03-19T21:24:44.750Z
Stopped at: Completed 03-06-PLAN.md (CAMP-02/UX-02 design decision — option A accepted)
Resume file: None
