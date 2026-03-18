# Project Research Summary

**Project:** Michal CRM — WhatsApp Campaign Manager
**Domain:** Single-user WhatsApp broadcast scheduler + lightweight CRM (Hebrew RTL, Airtable-backed)
**Researched:** 2026-03-17
**Confidence:** HIGH

---

## Executive Summary

This is a bespoke single-user tool replacing a fragile manual workflow (MAKE.com + Google Sheets + App Script rebuilt per event) with a purpose-built Next.js application. The core value proposition is automated, time-accurate WhatsApp message delivery to event registrants — where "7 days before", "morning of", and "30 minutes before" are the scheduling primitives Michal actually thinks in. The recommended approach is Next.js 16 (App Router) on Railway as a persistent Node.js process, with Bree as the in-process job scheduler, Airtable as the visible data backend, and the GREEN API v2 SDK for WhatsApp delivery. All data lives in Airtable so Michal retains direct access to her own data regardless of whether the dashboard is working.

The most important architectural decision is scheduling. Two research files conflicted: STACK.md recommends Bree + Railway (persistent Node.js process), while ARCHITECTURE.md recommends Vercel Cron + Vercel Pro. **This summary resolves the conflict in favor of Railway + Bree.** Vercel Cron on Pro has up to 59-second jitter (independently confirmed in PITFALLS.md), which makes "30 minutes before event" timing unreliable for a tool where timing accuracy is the core promise. Vercel function timeouts (10s Hobby / 60s Pro) combined with 100+ sequential GREEN API calls create a genuine risk of mid-batch kills. The documented Vercel issue (#51509) shows cron jobs re-register on every deployment. Bree runs in a persistent process on Railway, has no invocation timeout ceiling, no cold starts, and no re-registration behavior. Both Railway and Vercel Pro cost approximately $20/month — the cost argument for Vercel Pro does not hold. Railway + Bree is the correct choice.

The primary risks are all scheduling-related: duplicate sends due to missing idempotency state, timezone bugs from naive datetime storage, and GREEN API instance disconnects before events. All three have well-defined prevention patterns documented in the research and must be built in during the scheduling engine phase — they cannot be retrofitted.

---

## Key Findings

### Recommended Stack

The stack is straightforward and conservative. Next.js 16 with App Router provides the full-stack framework — React 19 for the UI, API routes for all server-side logic, and a single repo. TypeScript 5 is mandatory because Airtable field names are refactored frequently and compile-time safety prevents 2am campaign failures. Tailwind CSS 4 with shadcn/ui (January 2026 RTL release) handles the Hebrew RTL interface, using logical CSS utilities (`ms-*`, `ps-*`, `start-*`) that work natively in Tailwind 4. The `--rtl` CLI flag during shadcn init handles physical-to-logical class transformation automatically.

Bree 9.x runs scheduled jobs in isolated worker threads (not the main thread), supports cron syntax and human-readable intervals, and requires no Redis or external queue. It is deployed on Railway alongside the Next.js server via a custom `server.ts` that starts Bree before calling `nextStart()`. The official Airtable npm SDK (0.12.2) handles all data access server-side only. The GREEN API v2 SDK (`@green-api/whatsapp-api-client-js-v2`) handles WhatsApp delivery — v1 is explicitly deprecated.

**Core technologies:**
- **Next.js 16 + React 19 + TypeScript 5:** Full-stack framework with type-safe Airtable field access
- **Tailwind CSS 4 + shadcn/ui (Jan 2026 RTL):** Hebrew RTL UI with logical CSS properties, accessible components
- **Bree 9.x:** In-process job scheduler, worker threads, no Redis dependency
- **Railway:** Persistent Node.js hosting — required for Bree; usage-based billing; stays alive unlike Render free tier
- **airtable 0.12.2:** Official Airtable SDK, server-side only
- **@green-api/whatsapp-api-client-js-v2:** Current (v1 deprecated Mar 2026), TypeScript-native
- **date-fns 4.x + date-fns-tz:** Date arithmetic for event-relative timing; `Asia/Jerusalem` for correct Israel DST handling
- **zod 3.x + react-hook-form 7.x:** Form validation and Airtable response schema validation

### Expected Features

The MVP replaces the entire MAKE.com + Google Sheets + App Script workflow. Every table-stakes feature listed below is a hard requirement — missing any one means Michal still needs the old system.

**Must have (table stakes — v1 launch):**
- Campaign creation (name, event date, event time)
- Message scheduling with event-relative timing ("7 days before", "morning of event at 08:00", "30 minutes before")
- Broadcast send to all campaign contacts via GREEN API
- Message send status screen (scheduled / sent / failed per message)
- Contact list (name, phone, join date)
- Contact-to-campaign assignment (who is registered for what event)
- CSV import of contacts from Rav Messer
- Welcome message trigger on new contact (configurable on/off)
- Hebrew RTL interface throughout
- Airtable as the data store (all reads/writes via API)

**Should have (v1.x — add after core loop validated):**
- Per-contact delivery status ("did this specific person get the message?")
- Event date change recalculation (cascade update all pending send_at timestamps)
- Monthly registration growth stats
- Copy messages from previous campaign

**Defer (v2+):**
- Personalized messages with name interpolation
- Email alert on send failure
- Link click tracking
- Rav Messer webhook sync (CSV import is sufficient)
- Multi-user access / authentication

**Anti-features to explicitly not build:**
- Reply/inbox management (Michal handles replies on her phone — different product)
- A/B message testing
- Chatbot / automated response flows
- Payment tracking

### Architecture Approach

The architecture is a standard Next.js full-stack pattern with one custom addition: Bree initialized in a persistent `server.ts` alongside Next.js, rather than Vercel serverless. All external API calls (Airtable, GREEN API) are server-side only — the browser never touches either service directly. Airtable acts as both the source of truth and the job queue: `ScheduledMessages` records carry a three-state `status` field (`pending` → `sending` → `sent | failed`) that makes the dispatch loop idempotent. Scheduled send times are computed and written to Airtable at campaign creation, not at dispatch time — making Airtable self-documenting and the cron job a dumb poller.

**Major components:**
1. **Next.js App Router pages (RSC):** Campaign list/detail, contact CRM, message status board — all server-rendered
2. **API route layer (`app/api/`):** Proxies all Airtable and GREEN API calls; holds campaign, contact, import, and broadcast endpoints
3. **`lib/airtable/`:** One file per table — the only code that touches Airtable SDK; full isolation boundary
4. **`lib/green-api/`:** Isolated GREEN API client — swap provider by changing this folder only
5. **`lib/scheduler/compute-send-times.ts`:** Pure function, no I/O — converts event date to 4 UTC send_at timestamps
6. **Bree scheduler (`scheduler/`):** Runs `check-due-messages` job every minute; calls `dispatchDueMessages()` from lib; no HTTP endpoint needed
7. **`server.ts`:** Custom server entry — starts Bree, then starts Next.js; deployed as single Railway service

### Critical Pitfalls

1. **Duplicate sends after cron retry** — Use three-state status (`pending` → `sending` → `sent/failed`). Update to `sending` before calling GREEN API. Records stuck in `sending` for 10+ minutes get reset by a cleanup check. Must be designed in before the first send; cannot be retrofitted.

2. **Timezone bugs causing wrong send times** — Store all `send_at` values in Airtable as UTC ISO 8601. Convert from Israel time to UTC at input time using `date-fns-tz` with the `Asia/Jerusalem` IANA identifier (handles Israel's non-standard DST rules). Display in Israel time in the UI. Hardcoding +2 or +3 will be wrong for half the year.

3. **GREEN API instance disconnects silently** — Call `getStateInstance` at the start of every Bree job invocation. If not `"authorized"`, abort the batch and show a visible status banner in the dashboard. Michal discovering disconnection on event morning is a high-severity failure.

4. **Phone number format breaks sends silently** — Normalize all numbers at import to `972XXXXXXXXXX` (no plus, no leading zero, no dashes). Append `@c.us` only at GREEN API call time. Validate with `checkWhatsapp` during import. Mixed formats from Rav Messer CSV are a given.

5. **Airtable API quota exhausted** — All Airtable reads go through Next.js API routes with server-side caching (30-60 second TTL). Never expose Airtable token as `NEXT_PUBLIC_`. Use Airtable Personal Access Token (50 req/sec) for the scheduler, not OAuth token (5 req/sec).

---

## Implications for Roadmap

Based on research, the feature dependencies and pitfall prevention phases suggest the following build order:

### Phase 1: Foundation — Airtable Base + Service Layer + Project Setup

**Rationale:** Nothing works without the data layer. Airtable tables must exist before any code that reads or writes them. The service layer (`lib/airtable/`) must be established with the server-only access pattern before any UI is built on top, or the security anti-pattern (client calling Airtable directly) will creep in.

**Delivers:** Initialized Next.js 16 project on Railway, Airtable base with all 5 tables (Campaigns, Contacts, CampaignEnrollments, ScheduledMessages, MessageLog), `lib/airtable/` CRUD service layer, Hebrew RTL root layout.

**Addresses:** Airtable quota pitfall (server-only access pattern established), security pattern (no `NEXT_PUBLIC_` tokens), Hebrew RTL setup.

**Avoids:** Client-side Airtable access anti-pattern; must be correct from the first line of data code.

### Phase 2: Contact CRM + CSV Import

**Rationale:** Contacts must exist before campaigns can enroll them. FEATURES.md marks contact list and CSV import as P1. Phone number normalization must happen at this phase — it cannot be fixed later without migrating stored data.

**Delivers:** Contact list UI (name, phone, join date), CSV import endpoint with E.164 normalization, deduplication by phone, contact detail view with campaign history.

**Addresses:** Contact list (table stakes), CSV import (table stakes), phone number normalization (critical pitfall #4).

**Avoids:** Mixed phone formats reaching the scheduler; `checkWhatsapp` validation at import time.

### Phase 3: Campaign Management + Message Scheduling

**Rationale:** Campaign creation is the core workflow. Event-relative timing must be built into the campaign model from day one — FEATURES.md explicitly warns against retrofitting it. `compute-send-times.ts` writes UTC `send_at` values to Airtable at creation time. Timezone handling must be correct here.

**Delivers:** Campaign create/edit form, event-relative message timing UI ("X days before at HH:MM"), `compute-send-times.ts` pure function, 4 × ScheduledMessage records written to Airtable on campaign save, contact enrollment UI.

**Addresses:** Campaign creation (table stakes), event-relative timing (differentiator), timezone handling (critical pitfall #6).

**Avoids:** Naive datetime storage; must store UTC from first campaign saved.

### Phase 4: GREEN API Integration + Scheduler Engine

**Rationale:** FEATURES.md identifies GREEN API integration as a hard prerequisite for all sending features. The three-state idempotency pattern and batch processing must be the initial implementation — not a later optimization. This is the highest-risk phase.

**Delivers:** `lib/green-api/` client with `sendWhatsApp()` and `getStateInstance()`, Bree scheduler initialized in `server.ts`, `check-due-messages` job running every minute, three-state status transitions, batch size limit (20 per invocation), GREEN API health check at job start, instance status indicator in dashboard header.

**Addresses:** Broadcast send (table stakes), welcome message trigger (table stakes), GREEN API integration (hard prerequisite).

**Avoids:** Duplicate sends (three-state status), mid-batch timeout (batch size limit), silent instance disconnects (health check + UI indicator).

**Research flag:** This phase has the most integration risk. Verify GREEN API rate limits (50 req/sec) and `Promise.allSettled` batching behavior with real instance before building status UI on top.

### Phase 5: Message Status Board + Broadcast UI

**Rationale:** The status board requires MessageLog records to exist — it must be built after the scheduler is running. FEATURES.md lists message status screen as P1 but it has a hard dependency on Phase 4.

**Delivers:** Per-campaign message status board (scheduled / sending / sent / failed), per-contact delivery status view, one-off broadcast "Send Now" button with two-step confirmation, failed message resend action.

**Addresses:** Message send status screen (table stakes), per-contact delivery status (v1.x differentiator), broadcast send UI.

**Avoids:** Missing confirmation before bulk send (UX pitfall — two-step confirmation required).

### Phase 6: Polish + Event Rescheduling + Growth Stats

**Rationale:** These are v1.x features (per FEATURES.md) that add meaningful value once the core sending loop is validated. Event date recalculation is needed the first time an event is rescheduled — which will happen. Monthly stats require 2-3 months of data.

**Delivers:** Event date change cascades (PATCH /api/campaigns/[id] recalculates all pending ScheduledMessages), monthly registration growth stats on contact list screen, copy-messages-from-previous-campaign, RTL mobile testing pass.

**Addresses:** Event date recalculation (v1.x differentiator), monthly growth stats (v1.x differentiator).

### Phase Ordering Rationale

- Phases 1-2 establish data before any UI exists — prevents the client-side Airtable anti-pattern from ever being "temporarily" introduced.
- Phone normalization in Phase 2 (before the scheduler in Phase 4) means no data migration is needed — all stored numbers are already E.164 when the first send runs.
- Timezone handling in Phase 3 (campaign creation) means no stored datetime migration — all `send_at` values are UTC from the first record written.
- The scheduler (Phase 4) depends on campaigns existing and GREEN API being validated — those come first.
- Status board (Phase 5) depends on MessageLog records — cannot be usefully built until Phase 4 has run at least once.
- The three most critical pitfalls (duplicate sends, timezone, phone format) are each addressed in the earliest phase that touches the relevant data. None are deferred.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 4 (GREEN API + Scheduler):** GREEN API rate limits with real instance under load; `Promise.allSettled` concurrency behavior; Bree job restart behavior on Railway crash/redeploy. Integration risk is HIGH.
- **Phase 3 (Campaign + Timezone):** `date-fns-tz` behavior at Israel DST transition boundaries (last Friday before April 2; last Sunday in October). Worth a focused test before this phase ships.

Phases with standard patterns (skip research-phase):

- **Phase 1 (Foundation):** Next.js 16 + Railway setup is well-documented with official templates. No surprises expected.
- **Phase 2 (Contacts + CSV):** CSV parsing and Airtable upsert are standard patterns. Phone normalization logic is well-defined in PITFALLS.md.
- **Phase 5 (Status Board):** React Server Components + Airtable query is standard. No novel patterns.
- **Phase 6 (Polish):** Cascade update and stats are straightforward CRUD operations.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack (Next.js, TypeScript, Tailwind, shadcn RTL) verified via official docs and changelogs. Bree 9.2.9 published Mar 2026 — confirmed current. GREEN API v2 deprecation of v1 confirmed in official docs. |
| Features | HIGH | Grounded in replacing a specific, known workflow (not market research). P1/P2/P3 prioritization is conservative and domain-appropriate. Anti-features list is well-reasoned. |
| Architecture | HIGH | Vercel and Airtable patterns verified against official docs. Scheduling conflict resolved in favor of Railway + Bree based on converging evidence from STACK.md, PITFALLS.md, and Vercel's own documentation. |
| Pitfalls | HIGH | All critical claims verified against official sources (GREEN API rate limit docs, Vercel function timeout docs, Airtable API limit docs). Idempotency and timezone pitfalls are well-established patterns, not speculation. |

**Overall confidence:** HIGH

### Scheduling Conflict Resolution

STACK.md recommended Bree + Railway. ARCHITECTURE.md recommended Vercel Cron + Vercel Pro. This summary resolves the conflict: **Railway + Bree is the correct choice.**

Evidence:
1. Vercel cron has up to 59-second jitter (confirmed in PITFALLS.md from Vercel official docs) — makes "30 minutes before event" unreliable by design.
2. Vercel function timeout (10s Hobby / 60s Pro) combined with 100 contacts × GREEN API calls is a real ceiling. Bree jobs have no timeout ceiling.
3. Vercel issue #51509 documents cron re-registration on deployment — a known production bug.
4. Railway usage-based billing is approximately $20/month for idle-light workloads — same cost as Vercel Pro, with persistent process benefits.
5. PITFALLS.md identifies the Vercel Hobby cron limit as a "Critical Pitfall" and recommends external triggers or persistent process as the fix.

The Vercel Cron architecture remains documented as a valid alternative (ARCHITECTURE.md's "Vercel Hobby + Railway Scheduler" fallback) but is not the recommended path.

### Gaps to Address

- **Airtable Plan:** Free plan allows 1,000 API calls/month — easily exhausted with a dashboard. Team plan ($20/month) eliminates this. The plan tier decision should be made before launch, not after hitting the limit mid-campaign.
- **GREEN API instance warm-up:** For new GREEN API instances, there may be a warm-up period before bulk sends are permitted. PITFALLS.md flags WhatsApp account ban risk but cites a MEDIUM-confidence source. Verify with GREEN API support before first production campaign.
- **Rav Messer CSV column mapping:** The exact column names in Rav Messer exports are unknown. The import handler will need a column-mapping step — the degree of variation should be confirmed before Phase 2 implementation.

---

## Sources

### Primary (HIGH confidence)

- [Vercel Cron Jobs — Official Docs](https://vercel.com/docs/cron-jobs) — Hobby plan limits, Pro plan per-minute cron, idempotency guidance
- [Vercel Cron Jobs — Usage and Pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) — Hobby = once/day maximum confirmed
- [Vercel Function Timeouts](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out) — 10s Hobby / 60s Pro limits
- [GREEN API Node.js v2 SDK docs](https://green-api.com/en/docs/sdk/nodejs/client-v2/) — v1 deprecation, v2 package name confirmed
- [GREEN API Rate Limiter](https://green-api.com/en/docs/api/ratelimiter/) — 50 req/sec sendMessage limit confirmed
- [GREEN API Phone Number Format](https://green-api.com/en/blog/how-to-correctly-enter-international-numbers-for-whatsapp/) — `972XXXXXXXXXX@c.us` format confirmed
- [Airtable Rate Limits](https://airtable.com/developers/web/api/rate-limits) — 5 req/sec standard, 50 req/sec Personal Access Token
- [Airtable Managing API Call Limits](https://support.airtable.com/docs/managing-api-call-limits-in-airtable) — 1,000/month free plan confirmed
- [shadcn/ui RTL changelog Jan 2026](https://ui.shadcn.com/docs/changelog/2026-01-rtl) — `--rtl` CLI flag, DirectionProvider confirmed
- [Bree GitHub](https://github.com/breejs/bree) — 9.2.9 Mar 2026, worker thread architecture confirmed
- [Railway Next.js deploy template](https://github.com/nextjs/deploy-railway) — persistent process confirmed

### Secondary (MEDIUM confidence)

- [Better Stack Node.js schedulers comparison](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/) — Bree vs BullMQ comparison (single source)
- [WhatsApp bulk messaging ban risks 2025](https://whautomate.com/top-reasons-why-whatsapp-accounts-get-banned-in-2025-and-how-to-avoid-them/) — warm-up period, quality rating concerns

### Tertiary (referenced for context)

- [Vercel cron re-trigger on deploy issue #51509](https://github.com/vercel/next.js/discussions/51509) — documented community issue, influenced scheduling decision

---

*Research completed: 2026-03-17*
*Ready for roadmap: yes*
