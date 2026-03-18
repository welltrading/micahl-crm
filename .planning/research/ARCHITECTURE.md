# Architecture Research

**Domain:** WhatsApp Campaign Manager — Next.js + Airtable + GREEN API
**Researched:** 2026-03-17
**Confidence:** HIGH (Vercel/Airtable/GREEN API all have official docs; patterns verified)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        BROWSER (Michal)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Campaigns   │  │   Contacts   │  │  Message Status      │   │
│  │  Dashboard   │  │   (CRM)      │  │  Board               │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │  HTTPS          │                      │
┌─────────▼────────────────▼──────────────────────▼───────────────┐
│                     NEXT.JS APP (Vercel)                         │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              App Router Pages (RSC)                      │    │
│  │   /campaigns   /contacts   /campaigns/[id]/status        │    │
│  └─────────────────────────────┬───────────────────────────┘    │
│                                │                                 │
│  ┌─────────────────────────────▼───────────────────────────┐    │
│  │                  API Route Layer                         │    │
│  │  /api/campaigns   /api/contacts   /api/messages          │    │
│  │  /api/import      /api/cron/dispatch                     │    │
│  └─────────┬─────────────────────────┬───────────────────┬─┘    │
│            │                         │                   │      │
└────────────┼─────────────────────────┼───────────────────┼──────┘
             │                         │                   │
┌────────────▼────────┐   ┌────────────▼────────┐  ┌──────▼──────┐
│     AIRTABLE        │   │    GREEN API         │  │  RAV MESSER │
│  (Source of Truth)  │   │  (WhatsApp Sending)  │  │  (CSV/API   │
│                     │   │                      │  │   Import)   │
│  Tables:            │   │  POST /sendMessage   │  └─────────────┘
│  - Campaigns        │   │  idInstance +        │
│  - Contacts         │   │  apiTokenInstance    │
│  - ScheduledMsgs    │   └──────────────────────┘
│  - MessageLog       │
└─────────────────────┘
             ▲
             │ Vercel Cron (every minute, Pro plan)
┌────────────┴────────┐
│   /api/cron/        │
│   dispatch          │
│                     │
│  Runs every minute: │
│  1. Query Airtable  │
│     for msgs due    │
│     in next window  │
│  2. Send via GREEN  │
│     API             │
│  3. Update Airtable │
│     status          │
└─────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| Next.js Pages (RSC) | Render campaign/contact/status UIs | App Router Server Components |
| API Routes | Proxy all Airtable calls (protect API key), orchestrate business logic | `app/api/*/route.ts` |
| Airtable Service | Single module wrapping `airtable` npm SDK | `lib/airtable/` |
| Scheduler (Cron) | Every-minute poll — find due messages, send them | `app/api/cron/dispatch/route.ts` |
| GREEN API Service | Send WhatsApp messages via REST | `lib/green-api/` |
| Import Handler | Parse CSV / call Rav Messer API, upsert contacts to Airtable | `app/api/import/route.ts` |

---

## Scheduler Architecture Decision

### The Core Question: Where Does Scheduling Live?

**Recommendation: Vercel Cron (every 1 minute) on Vercel Pro plan.**

This is the correct answer for this project. Here is why each alternative fails:

**Option A — Vercel Cron (RECOMMENDED, Pro plan required)**
- The cron route runs every minute, queries Airtable for ScheduledMessages where `status = "pending"` AND `send_at <= now + 2 minutes`
- Sends them via GREEN API, then marks them `status = "sent"` in Airtable
- No persistent server needed — entire app stays on Vercel
- Cost: ~$20/month for Vercel Pro

**Option B — Vercel Cron, Hobby plan (DO NOT USE)**
- Hobby plan limits cron to once per day, ±59 minute precision
- A "30 minutes before event" reminder becomes unreliable
- This is a hard blocker — verified in Vercel official docs

**Option C — Separate Node process (Railway/Render)**
- A persistent Node.js process running `node-cron` every minute
- More control, no cold starts, no 10-second timeout concern
- Adds infrastructure complexity: 2 services to manage, 2 deploy targets
- Viable if budget is tight and Vercel Pro is rejected, but more moving parts

**Option D — Airtable Automations**
- Airtable can trigger automations on schedule or record change
- Severely limited: no ability to call GREEN API directly, complex webhook chain
- Avoid — adds coupling and Airtable automation quota concerns

**Winner: Vercel Cron on Pro plan** because it keeps everything in one codebase, one deploy pipeline, and one platform. The project has low volume (1-2 events/month, ~50-200 contacts), so a 10-second function timeout per cron tick is ample.

### Cron Idempotency Design (Critical)

Vercel documents that cron events can fire twice. The ScheduledMessages table must include a `status` field used as a lock:

```
ScheduledMessages record:
  status: "pending" | "sending" | "sent" | "failed"
```

The cron handler:
1. Queries for records with `status = "pending"` AND `send_at <= now`
2. Immediately patches each record to `status = "sending"` (optimistic lock)
3. Sends via GREEN API
4. Patches to `status = "sent"` or `status = "failed"`

This prevents double-sends even if the cron fires twice.

---

## Airtable as Database

### Table Design

```
Campaigns
  - id (Airtable record ID)
  - name (text)
  - event_date (date + time)
  - status: "draft" | "active" | "completed"
  - linked to: ScheduledMessages (one-to-many)

Contacts
  - id (Airtable record ID)
  - name (text)
  - phone (text, E.164 format: 972501234567)
  - joined_at (date)
  - source: "import" | "manual"
  - linked to: CampaignEnrollments (junction)

CampaignEnrollments  (junction table)
  - Campaign (linked to Campaigns)
  - Contact (linked to Contacts)

ScheduledMessages
  - Campaign (linked to Campaigns)
  - message_type: "week_before" | "day_before" | "morning_of" | "30min_before"
  - message_body (long text)
  - send_at (date + time, computed from campaign event_date)
  - status: "pending" | "sending" | "sent" | "failed"
  - sent_at (date + time)
  - recipient_count (number)

MessageLog  (per-contact send record)
  - ScheduledMessage (linked)
  - Contact (linked)
  - status: "sent" | "failed"
  - whatsapp_response (text, GREEN API response ID)
  - attempted_at (date + time)
```

### Airtable Access Pattern

All Airtable calls are server-side only — never from the browser. The `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID` environment variables are never exposed to the client.

```
Browser → Next.js API Route → lib/airtable/service.ts → Airtable REST API
```

The `airtable` npm package (official SDK) is the only wrapper to use. Do not use raw `fetch` against Airtable REST — the SDK handles pagination and rate limits gracefully.

### Rate Limit Reality Check

Airtable enforces 5 requests/second per base. For this project's volume (sending to 50-200 contacts per campaign), sending 1 GREEN API call per contact from within the cron job is safe. The cron job does:
- 1 Airtable read (list pending messages)
- N Airtable writes (update status, write log) where N = messages due right now (almost always 0-3)
- M GREEN API calls where M = contacts enrolled in the campaign

This is well under Airtable rate limits for 1-2 events per month.

---

## Recommended Project Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── campaigns/
│   │   │   ├── page.tsx              # Campaign list
│   │   │   ├── new/page.tsx          # Create campaign form
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Campaign detail
│   │   │       └── status/page.tsx   # Message send status board
│   │   ├── contacts/
│   │   │   └── page.tsx              # CRM contact list
│   │   └── layout.tsx                # Dashboard shell (nav, RTL)
│   └── api/
│       ├── campaigns/
│       │   ├── route.ts              # GET list, POST create
│       │   └── [id]/
│       │       ├── route.ts          # GET, PATCH, DELETE
│       │       └── enroll/route.ts   # POST enroll contacts
│       ├── contacts/
│       │   └── route.ts              # GET list, POST create
│       ├── import/
│       │   └── route.ts              # POST CSV or Rav Messer API
│       ├── messages/
│       │   └── broadcast/route.ts    # POST one-off broadcast
│       └── cron/
│           └── dispatch/route.ts     # GET (Vercel Cron endpoint)
├── lib/
│   ├── airtable/
│   │   ├── client.ts                 # Airtable SDK init (singleton)
│   │   ├── campaigns.ts              # CRUD for Campaigns table
│   │   ├── contacts.ts               # CRUD for Contacts table
│   │   ├── scheduled-messages.ts     # CRUD + status updates
│   │   └── message-log.ts            # Write MessageLog records
│   ├── green-api/
│   │   ├── client.ts                 # GREEN API REST client
│   │   └── send.ts                   # sendWhatsApp(phone, body)
│   └── scheduler/
│       └── compute-send-times.ts     # Given event_date → 4 send_at timestamps
├── components/
│   ├── campaigns/                    # Campaign-related UI components
│   ├── contacts/                     # Contact table, import modal
│   └── ui/                           # Generic RTL-aware components
└── vercel.json                       # Cron job definition
```

### Structure Rationale

- **`lib/airtable/`:** One file per table — replaceability boundary. If Airtable is replaced, only these files change. No Airtable SDK references leak into page components.
- **`lib/green-api/`:** Isolated — GREEN API SDK details stay here. If the WhatsApp provider changes, swap this folder.
- **`lib/scheduler/`:** Pure logic — computes timestamps from event date. Has no I/O, fully testable.
- **`app/api/cron/dispatch/`:** Only Vercel Cron calls this. Protected by `CRON_SECRET` header check.

---

## Architectural Patterns

### Pattern 1: Airtable as Source of Truth with Status-Based Locking

**What:** ScheduledMessages records carry a `status` field that the cron job transitions atomically. The record is both the task queue and the audit log.

**When to use:** When you have no separate database but need idempotent task processing.

**Trade-offs:** Airtable is not a transactional database — there is a small window between "read pending" and "write sending" where two simultaneous cron invocations could both read the same record. At this project's scale (1-2 events/month, Vercel's occasional-duplicate behavior) this window is acceptable. At high volume, a proper queue (Redis, Postgres) would be needed.

**Example:**
```typescript
// lib/scheduler/dispatch.ts
export async function dispatchDueMessages() {
  const due = await getScheduledMessages({ status: 'pending', due: true })

  for (const msg of due) {
    // Optimistic lock — mark sending before calling GREEN API
    await updateMessageStatus(msg.id, 'sending')

    const contacts = await getEnrolledContacts(msg.campaignId)
    const results = await Promise.allSettled(
      contacts.map(c => sendWhatsApp(c.phone, msg.body))
    )

    const allOk = results.every(r => r.status === 'fulfilled')
    await updateMessageStatus(msg.id, allOk ? 'sent' : 'failed')
    await writeMessageLog(msg.id, contacts, results)
  }
}
```

### Pattern 2: Computed Scheduled Times at Campaign Creation

**What:** When Michal saves a campaign with an event date, the app immediately computes and writes all four `ScheduledMessages` records to Airtable with their `send_at` timestamps. The cron job is a dumb poller — it does not compute anything, it only queries `send_at <= now`.

**When to use:** Always — this avoids timezone bugs and makes the Airtable view self-documenting (Michal can see all four scheduled times directly in Airtable).

**Trade-offs:** If Michal changes the event date, all four ScheduledMessages must be recomputed and updated. The API handler for `PATCH /api/campaigns/[id]` must handle this recalculation.

```typescript
// lib/scheduler/compute-send-times.ts
export function computeSendTimes(eventDate: Date): Record<MessageType, Date> {
  return {
    week_before:  subDays(eventDate, 7),
    day_before:   subDays(eventDate, 1),
    morning_of:   setHours(startOfDay(eventDate), 8), // 08:00 on event day
    thirty_min:   subMinutes(eventDate, 30),
  }
}
```

### Pattern 3: Proxy All External API Calls Through Next.js API Routes

**What:** The browser never calls Airtable or GREEN API directly. All secrets live in Vercel environment variables and are used only in server-side code.

**When to use:** Always — exposing `AIRTABLE_API_KEY` in the browser gives Michal full read/write access to the Airtable base from anyone who opens DevTools.

**Trade-offs:** Slightly more boilerplate (each operation needs an API route). Completely necessary for security.

---

## Data Flow

### Flow 1: Campaign Creation + Message Scheduling

```
Michal fills campaign form (name, event_date, message bodies)
    ↓
POST /api/campaigns
    ↓
lib/scheduler/compute-send-times.ts  →  4 × send_at timestamps
    ↓
lib/airtable/campaigns.ts            →  Create Campaign record
lib/airtable/scheduled-messages.ts   →  Create 4 ScheduledMessage records
                                         status = "pending"
    ↓
Airtable base updated — Michal can see all 4 rows in Airtable directly
```

### Flow 2: Contact Enrollment (from Rav Messer import)

```
Michal uploads CSV (or triggers Rav Messer API pull)
    ↓
POST /api/import
    ↓
Parse CSV / call Rav Messer API
    ↓
lib/airtable/contacts.ts    →  Upsert contacts (dedup by phone number)
    ↓
If campaign_id provided:
lib/airtable/campaigns.ts   →  Create CampaignEnrollment records
    ↓
Response: { imported: N, duplicates: M, enrolled: K }
```

### Flow 3: Scheduler Dispatch (every minute, Vercel Cron)

```
Vercel Cron fires GET /api/cron/dispatch (with CRON_SECRET header)
    ↓
Verify CRON_SECRET → 401 if invalid
    ↓
lib/airtable/scheduled-messages.ts
  → SELECT where status = "pending" AND send_at <= now()
    ↓
For each due message:
  1. PATCH status = "sending"          (optimistic lock)
  2. GET enrolled contacts for campaign
  3. For each contact:
       lib/green-api/send.ts → POST to GREEN API sendMessage
  4. PATCH status = "sent" / "failed"
  5. Write MessageLog records (per contact outcome)
    ↓
Return { dispatched: N, failed: M } — logged in Vercel function logs
```

### Flow 4: One-Off Broadcast

```
Michal clicks "Send Now" for a campaign
    ↓
POST /api/messages/broadcast { campaignId }
    ↓
GET enrolled contacts for campaign
    ↓
For each contact:
  lib/green-api/send.ts → POST to GREEN API sendMessage
    ↓
Write MessageLog records
    ↓
Return status to dashboard
```

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Airtable | `airtable` npm SDK, server-side only | 5 req/sec rate limit per base; SDK handles pagination |
| GREEN API | REST via `@green-api/whatsapp-api-client` npm or raw `fetch` | Phone numbers must be E.164 without `+`: `972501234567@c.us` |
| Rav Messer | CSV upload OR REST API import | Import-only; no ongoing sync |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Pages ↔ API Routes | Next.js `fetch` to own API routes | Never import `lib/airtable/` directly from page components |
| API Routes ↔ Airtable Service | Direct module import | `lib/airtable/*.ts` is server-only |
| API Routes ↔ GREEN API Service | Direct module import | `lib/green-api/*.ts` is server-only |
| Cron ↔ Business Logic | Cron route calls `dispatchDueMessages()` from `lib/scheduler/` | Scheduler logic separated from HTTP handler |

---

## Anti-Patterns

### Anti-Pattern 1: Calling Airtable from Client Components

**What people do:** Import `airtable` in a React component and call it directly from the browser.

**Why it's wrong:** Exposes `AIRTABLE_API_KEY` in the client bundle. Anyone can open DevTools, find the key, and delete or corrupt the entire Airtable base.

**Do this instead:** All Airtable calls go through `/api/*` route handlers. Environment variables stay server-side.

### Anti-Pattern 2: Computing Send Times in the Cron Job

**What people do:** The cron job holds the logic "event is in 7 days → send week_before message."

**Why it's wrong:** The cron job must then know about every campaign's event date, compute offsets, and decide whether to send. This is complex, error-prone, and means the Airtable view shows no scheduled times — Michal can't see what's coming.

**Do this instead:** Write `send_at` timestamps to Airtable at campaign creation. The cron job only does `SELECT WHERE send_at <= now()`. Airtable becomes a self-documenting schedule.

### Anti-Pattern 3: One GREEN API Call Per Contact in Series

**What people do:** Loop over contacts with `await sendWhatsApp(contact)` sequentially.

**Why it's wrong:** For 100 contacts, each GREEN API call taking ~300ms = 30 seconds. Vercel function default timeout is 10 seconds (Hobby) or 60 seconds (Pro). 100 contacts in series risks timeout.

**Do this instead:** Use `Promise.allSettled()` to fan out calls in parallel, or batch in chunks of 20. For this project's scale (50-200 contacts), `Promise.allSettled` with a small concurrency limit (10 at a time) is sufficient.

### Anti-Pattern 4: Using Vercel Hobby Plan for This Project

**What people do:** Deploy to free Vercel Hobby tier to save money.

**Why it's wrong:** Hobby plan restricts cron to once per day with ±59 minute precision. A "30 minutes before event" reminder cannot work. Deploying on Hobby and testing cron behavior will produce completely wrong timing.

**Do this instead:** Use Vercel Pro ($20/month) which gives per-minute cron precision. Alternatively, use a separate always-on Node.js process on Railway or Render (free tier available) running `node-cron` — this eliminates the Vercel plan dependency entirely.

---

## Deployment Considerations

### Recommended Deployment: Vercel Pro

```
vercel.json:
{
  "crons": [
    {
      "path": "/api/cron/dispatch",
      "schedule": "* * * * *"
    }
  ]
}
```

- Single deploy target: `vercel --prod`
- Environment variables: `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `GREEN_API_INSTANCE_ID`, `GREEN_API_TOKEN`, `CRON_SECRET`
- No database to manage — Airtable handles persistence
- Cost: ~$20/month Vercel Pro

### Alternative Deployment: Vercel Hobby + Railway Scheduler

If Vercel Pro cost is a concern:

```
Service 1: Next.js on Vercel Hobby (free)
  - All pages and API routes
  - No cron configured here

Service 2: Node.js worker on Railway (free tier)
  - Runs node-cron every minute
  - Calls /api/cron/dispatch on the Vercel app via HTTP
  - Or runs the dispatch logic directly with Airtable + GREEN API
```

This works but adds operational complexity. The Railway free tier spins down after inactivity — use Railway's "always on" setting for the worker service.

### Not Recommended: Self-Hosted

Michal is the only user and runs 1-2 events/month. A VPS or Docker setup adds maintenance overhead with no benefit.

---

## Suggested Build Order

The components have these dependencies:

```
1. Airtable base setup (tables, fields)
         ↓
2. lib/airtable/ service layer (CRUD for all tables)
         ↓
3. lib/green-api/ send service
   lib/scheduler/ compute-send-times
         ↓
4. /api/campaigns CRUD routes
   /api/contacts CRUD routes
         ↓
5. Campaign + Contact UI pages
         ↓
6. /api/import (Rav Messer CSV)
         ↓
7. /api/cron/dispatch + vercel.json cron config
         ↓
8. /api/messages/broadcast
         ↓
9. Message status dashboard
```

**Why this order:**
- Steps 1-3 are the foundation — nothing else works without them
- Steps 4-5 let Michal use the app before scheduling is live
- Step 7 (cron) requires campaigns + contacts to exist to test
- Step 9 (status board) requires message logs to exist — build last

---

## Scaling Considerations

| Scale | Architecture Adjustment |
|-------|--------------------------|
| Current (1-2 events/month, 50-200 contacts) | Described above — no changes needed |
| 10 events/month, 1000 contacts | Watch Airtable rate limits on import; batch upserts in groups of 10 |
| 100 events/month, 10k contacts | Airtable becomes a bottleneck; migrate to Postgres + keep Airtable as read-only view for Michal |

At current scale, there is no scaling concern. This project does not need a queue, a caching layer, or a separate worker process (though a separate worker is a valid deployment trade-off as noted above).

---

## Sources

- [Vercel Cron Jobs — Official Docs](https://vercel.com/docs/cron-jobs)
- [Vercel Cron Jobs — Managing (timeout, idempotency, concurrency)](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [Vercel Cron Jobs — Usage and Pricing (Hobby = once/day limit)](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [GREEN API Node.js SDK — npm](https://www.npmjs.com/package/@green-api/whatsapp-api-client)
- [GREEN API Node.js SDK — GitHub](https://github.com/green-api/whatsapp-api-client-js)
- [GREEN API — Send Message Docs](https://green-api.com/en/docs/sdk/nodejs/client/sendmessage/)
- [Airtable npm SDK — Official](https://github.com/Airtable/airtable.js)
- [Airtable API Rate Limits](https://airtable.com/developers/web/api/rate-limits)
- [Airtable Webhooks API](https://airtable.com/developers/web/guides/webhooks-api)
- [Using Airtable as a Database with Next.js — Pipedream](https://pipedream.com/blog/using-airtable-as-a-database-with-next-js/)

---

*Architecture research for: WhatsApp Campaign Manager (Next.js + Airtable + GREEN API)*
*Researched: 2026-03-17*
