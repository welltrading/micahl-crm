# Pitfalls Research

**Domain:** WhatsApp Campaign Scheduler — Airtable + GREEN API + Next.js
**Researched:** 2026-03-17
**Confidence:** HIGH (all critical claims verified against official docs or multiple sources)

---

## Critical Pitfalls

### Pitfall 1: Duplicate Message Sends on Cron Retry

**What goes wrong:**
A scheduled cron fires, begins iterating over pending messages, fails partway through (timeout, crash, network error), and retries. Messages sent in the first run are sent again in the second. Recipients get the same WhatsApp message twice — for a 30-person event this is a visible, embarrassing failure.

**Why it happens:**
Developers check `status = "pending"` before sending, then update status to `"sent"` after the API call returns. If the process crashes between those two steps, the record stays `"pending"` and the next cron iteration re-sends.

**How to avoid:**
Use a three-state status model: `pending` → `processing` → `sent | failed`. Before calling GREEN API, atomically update the record to `processing`. Only records with `status = "pending"` are picked up by the cron. If a record stays `processing` for more than 10 minutes, a separate cleanup job resets it to `pending`. This pattern makes the cron idempotent.

In Airtable terms: before the send loop, update the batch of records from `pending` to `processing`. Any records that are `processing` for over 10 minutes and have no GREEN API message ID are reset by a separate endpoint.

**Warning signs:**
- Test environment shows double messages with no obvious cause
- Status updates and API calls are in the same try block with no intermediate save
- No `processing` state in the status field design

**Phase to address:**
Scheduling engine phase (the phase that builds the cron + send loop). Must be designed in before the first message is sent.

---

### Pitfall 2: Vercel Hobby Cron — Once Per Day Maximum

**What goes wrong:**
The project deploys to Vercel Hobby (free tier). Cron jobs on Hobby are limited to one invocation per day per job. A scheduler that needs to fire every 5 minutes (to catch messages due in the next window) cannot run on Hobby.

**Why it happens:**
Vercel's free tier limits cron jobs to 2 total, each triggering once per day maximum. Developers discover this only after deploying and wondering why scheduled messages are not going out.

**How to avoid:**
Either upgrade to Vercel Pro (40 cron jobs, unlimited daily invocations) or use an external trigger: a free-tier cron service (Render cron, GitHub Actions scheduled workflow, or Upstash QStash) that calls a Next.js API route endpoint every N minutes. The API route acts as the scheduler logic; the external service is just a trigger.

For this project, a GitHub Actions workflow on a schedule (every 5 minutes) calling a secured `/api/cron/send-scheduled` endpoint is a zero-cost solution that bypasses Vercel limits entirely.

**Warning signs:**
- Deployed on Vercel Hobby
- `vercel.json` cron schedule is more frequent than `0 * * * *` (hourly)
- Testing cron locally (node-cron) — it works locally but will not work in serverless

**Phase to address:**
Infrastructure/deployment phase (before scheduler is built). The trigger mechanism must be decided before implementing the scheduler logic.

---

### Pitfall 3: Vercel Function Timeout Kills Mid-Batch Sends

**What goes wrong:**
The cron handler fetches all pending messages and iterates through them, calling GREEN API for each. With 30+ recipients, the loop takes longer than 10 seconds (Hobby limit) or 60 seconds (Pro limit). Vercel kills the function. The batch is half-sent. Some recipients get the message, some do not. Status records are in `processing` limbo.

**Why it happens:**
Each GREEN API call is a network round-trip. At 30 recipients × 200ms per call = 6 seconds. This is fine. But with 100+ recipients, retries on failures, or slow network: timeout. The problem grows silently until it breaks.

**How to avoid:**
Process messages in small batches per invocation (max 20 messages). Store a cursor (last processed record ID) in Airtable or use an offset-based approach so each cron invocation picks up where the last left off. Alternatively, use Vercel's `waitUntil` (edge runtime) or offload to a queue (Upstash QStash) for long processing.

For this project's scale (30-100 recipients per event), batching 20 per invocation is sufficient and simple.

**Warning signs:**
- No batch size limit on the send loop
- A single API route handles all recipients in one pass
- Function duration is not monitored

**Phase to address:**
Scheduling engine phase. Batch processing must be the default implementation, not a later optimization.

---

### Pitfall 4: Airtable as the Source of Truth Creates Race Conditions

**What goes wrong:**
The cron reads `pending` messages from Airtable, updates them to `processing`, then sends. But Airtable's API has no atomic read-then-write operation. Two cron invocations running concurrently can both read the same `pending` record before either has written `processing` back. Both send the message.

**Why it happens:**
Airtable is a spreadsheet-like database, not a transactional SQL database. There is no `SELECT FOR UPDATE` or atomic compare-and-swap. This is a fundamental constraint of Airtable as a scheduler backing store.

**How to avoid:**
Prevent concurrent cron invocations. Use a "lock" record in Airtable: a dedicated record that stores `locked: true / false` and a `locked_at` timestamp. The cron's first action is to check and set this lock. If already locked (and not stale), the invocation exits early. This is a soft lock — it reduces the race window to near-zero for a single-user system with low invocation frequency.

Alternatively, if using an external cron trigger (GitHub Actions), configure it to not overlap: GitHub Actions scheduled workflows do not overlap by design unless the previous run is still active — add a `concurrency` group to the workflow.

**Warning signs:**
- No concurrency protection in the cron handler
- Cron trigger interval is shorter than max execution time
- Two simultaneous test runs produce doubled sends

**Phase to address:**
Scheduling engine phase. Must be addressed during design of the send loop.

---

### Pitfall 5: GREEN API Phone Number Format Breaks Silently

**What goes wrong:**
Israeli phone numbers are stored in Airtable in various formats: `050-1234567`, `+972-50-1234567`, `0501234567`, `972501234567`. GREEN API requires the format `972501234567@c.us` — no plus sign, no leading zero, no dashes, no parentheses, country code prepended. If the format is wrong, the API returns a 400 validation error or the message goes to the wrong number (or nowhere).

**Why it happens:**
Michal imports contacts from Rav Messer (a marketing platform) via CSV. That CSV uses whatever format the lead entered their number. No normalization step exists. The developer assumes the stored format is correct.

**How to avoid:**
Normalize all phone numbers to E.164 format at import time. For Israeli numbers:
1. Strip all non-digit characters (`+`, `-`, `(`, `)`, spaces)
2. Remove leading `0` if present after country code removal
3. Prepend `972` if not already present
4. Append `@c.us` when calling GREEN API

Use GREEN API's `checkWhatsapp` method to validate that the normalized number is an active WhatsApp account before adding it to send lists.

Store numbers in Airtable in a normalized numeric format: `972501234567` (no `@c.us` suffix — add that at call time).

**Warning signs:**
- Phone numbers in Airtable have mixed formats
- No normalization function in the import code
- 400 errors from GREEN API on first test send

**Phase to address:**
Contact import / CRM phase. Normalization must happen at data entry, not at send time.

---

### Pitfall 6: Timezone Mismatch — Messages Send at Wrong Time

**What goes wrong:**
Michal creates a campaign for an event at 19:00 Israel time. The scheduler stores and compares times in UTC. Vercel servers run in UTC. Israel Standard Time is UTC+2 (IST) or UTC+3 (IDT during daylight saving, March–October). A message scheduled for 18:30 Israel time (30 min before event) fires at 16:30 or 15:30 UTC — which may be 18:30 or 17:30 Israel time depending on daylight saving. Off by one hour during DST transitions.

**Why it happens:**
Developers store `scheduled_at` as a naive datetime without timezone info, compare it with `new Date()` (UTC), and do not account for Israel's DST switch. Israel uses DST from the last Friday before April 2 to the last Sunday in October — dates that do not align with European or US DST rules.

**How to avoid:**
Store all scheduled times in Airtable as UTC ISO 8601 strings (`2026-04-15T15:30:00Z`). When Michal inputs an event time in the UI, the frontend converts from Israel time to UTC before saving. Use the `date-fns-tz` or `luxon` library with the `Asia/Jerusalem` timezone identifier (which handles Israel's specific DST rules). Display times back in Israel time in the UI.

Never store naive times or compare naive times in the scheduler.

**Warning signs:**
- Datetime fields in Airtable have no timezone suffix
- The UI lets users type a time without a timezone selector
- `new Date()` used directly without timezone conversion
- Test sends at wrong time noticed only near a DST boundary

**Phase to address:**
Campaign management phase (when event + message scheduling UI is built). Must be correct from day one — migrating stored datetime formats later is painful.

---

### Pitfall 7: GREEN API Instance Disconnects Without Alerting

**What goes wrong:**
GREEN API works by keeping a WhatsApp Web session alive on a cloud instance. If the WhatsApp account is logged out (phone battery dies, WhatsApp reinstalled, too long inactive, or GREEN API session expires), the instance shows as disconnected. All subsequent send attempts return errors. Michal discovers this the morning of an event when messages fail to go out.

**Why it happens:**
Developers assume the GREEN API instance stays connected indefinitely. There is no health-check built into the scheduler. Failures are logged but no alert reaches the user.

**How to avoid:**
Add a health-check call to GREEN API's `getStateInstance` endpoint at the start of every cron invocation. If the instance state is not `"authorized"`, abort the send batch and trigger an alert to Michal (email, or write a visible status banner in the dashboard).

Build an instance status indicator into the dashboard UI so Michal can see at a glance whether WhatsApp is connected before an event.

**Warning signs:**
- No health check before send loop
- Instance state not displayed anywhere in the UI
- All message failures attributed to other causes

**Phase to address:**
GREEN API integration phase and dashboard UI phase.

---

### Pitfall 8: Airtable Monthly API Call Quota Exhausted on Free Plan

**What goes wrong:**
As of January 2025, Airtable free plan allows 1,000 API calls per month. The dashboard makes API calls on every page load (list campaigns, list contacts, get message statuses). A polling-based status refresh (every 30 seconds) can eat through 1,000 calls in hours. The integration stops working silently until the next calendar month.

**Why it happens:**
Developers build the UI to poll Airtable directly for live status updates, treating it like a real-time database. The call volume is fine in development (< 100 calls) but exceeds the quota quickly in production with a moderately active dashboard.

**How to avoid:**
Use Airtable Personal Access Tokens (which have a rate limit of 50 req/sec vs 5 req/sec for standard tokens) and cache reads server-side. All reads go through Next.js API routes that cache the response for 30–60 seconds using `unstable_cache` or a simple in-memory cache. Avoid client-side direct Airtable calls.

For the free plan scenario, batch all reads into a single `listRecords` call per page load (filter server-side, not client-side) to minimize call count. The Team plan (100,000 calls/month) eliminates this concern for ~$20/month.

**Warning signs:**
- Client components calling Airtable API directly via `fetch`
- Status page refreshing data every few seconds
- No server-side caching layer

**Phase to address:**
Data access layer phase (first phase that touches Airtable). Establish the server-only access pattern before building any UI.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store phone numbers without normalization | Faster import | Broken sends, manual fixes at every campaign | Never — normalize at import |
| Poll Airtable from client every 30s | Simple live status | Quota exhausted, 429 errors mid-campaign | Never — use server cache |
| Two-state status (pending/sent) | Simple model | Duplicate sends after retry | Never — use three states |
| Hardcode Israel timezone offset as +2 or +3 | Avoids library dependency | Wrong time 6 months/year due to DST | Never — use `Asia/Jerusalem` IANA identifier |
| Skip GREEN API health check before sends | Fewer API calls | Silent failures on event day | Never for production |
| No batch size limit on send loop | Simpler code | Vercel timeout mid-batch | Never — batch from day one |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| GREEN API | Using `+972501234567` format | Use `972501234567@c.us` — no plus, no leading zero, append `@c.us` |
| GREEN API | Assuming instance stays connected | Call `getStateInstance` before every batch; surface status in UI |
| GREEN API | Sending all 30 messages in parallel | Send sequentially or in small parallel batches (5 at a time); 50 req/sec limit per instance is generous but bursts can still hit 429 |
| Airtable | Reading directly from client components | All Airtable access through server-side Next.js API routes only |
| Airtable | Using OAuth token (5 req/sec) for scheduler | Use Personal Access Token (50 req/sec) for the cron job |
| Airtable | No retry on 429 | Implement exponential backoff: wait 30s on first 429, then retry |
| Vercel Cron | Relying on Hobby cron for < 1 hour intervals | Use external trigger (GitHub Actions, Upstash QStash) on Hobby plan |
| Vercel Cron | Assuming cron fires at exact scheduled time | Vercel cron has up to 59-second jitter; do not rely on minute-precision |
| Rav Messer CSV | Assuming import phone format is consistent | Normalize all numbers at import, validate with `checkWhatsapp` before adding |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching all contacts for every page render | Slow dashboard, 429 errors | Cache Airtable responses server-side, paginate | At 200+ contacts |
| Sending all campaign messages in one cron invocation | Vercel timeout, partial sends | Batch 20 messages per invocation, cursor-based | At 30+ messages per batch |
| No index on `scheduled_at` equivalent in Airtable | Slow filter queries for pending messages | Use a dedicated `status` field as primary filter, not a computed datetime comparison | At 500+ message records |
| Fetching full record list to find one record | Slow and wastes API calls | Use Airtable `filterByFormula` in list requests | Always wasteful — avoid from day one |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing GREEN API token in client-side code | Anyone can send WhatsApp messages from Michal's account | All GREEN API calls server-side only; token in environment variable |
| Cron endpoint accessible without auth | Anyone can trigger a mass send by hitting `/api/cron/send-scheduled` | Validate `CRON_SECRET` header (Vercel sets this automatically for Vercel-triggered crons); for external triggers, use a bearer token |
| Airtable Personal Access Token in `NEXT_PUBLIC_` env | Token visible in browser bundle; anyone can read/write all data | Token only in server-side env vars; never prefix with `NEXT_PUBLIC_` |
| No validation on imported CSV data | Malformed phone numbers, script injection in contact names | Sanitize all CSV fields at import, validate phone format before storing |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Datetime input in UTC (HTML default) | Michal enters 19:00 but message goes out at 21:00 (or 22:00) | Show timezone explicitly in the input; convert to UTC server-side before saving |
| No confirmation before broadcast send | Accidental sends to 50 people | Two-step confirmation: preview recipients count, then confirm |
| RTL layout broken for number inputs | Phone number fields display in wrong direction | Set `dir="ltr"` on phone number and number inputs explicitly, even inside an RTL layout |
| Status page shows UTC timestamps | Michal confused about when messages went out | Always display timestamps in `Asia/Jerusalem` time with explicit label |
| No visual indicator for GREEN API connection status | Michal doesn't know WhatsApp is disconnected until event day | Persistent status badge in header; red/green based on `getStateInstance` result |
| Hebrew text in WhatsApp messages not previewed before send | Michal sends message with RTL/LTR mixing issue | Add a preview render in the campaign message editor |

---

## "Looks Done But Isn't" Checklist

- [ ] **Message scheduler:** Status shows "sent" — verify the GREEN API response was `200` and message ID was stored, not just that the request was fired
- [ ] **Contact import:** CSV imported successfully — verify all phone numbers were normalized and passed `checkWhatsapp` validation, not just that rows were created
- [ ] **Campaign creation:** Campaign saved — verify `scheduled_at` was stored in UTC, not in local time
- [ ] **Cron job:** Works in local dev (`node-cron`) — verify it is triggered by an external mechanism in production, not relying on Vercel Hobby internal cron
- [ ] **GREEN API integration:** Test message sent — verify the WhatsApp instance is in `authorized` state check, not just that one message went through
- [ ] **RTL layout:** Looks correct on Chrome desktop — verify on mobile (iOS Safari, Android Chrome) where RTL text rendering differs
- [ ] **Failed message handling:** Failed messages are marked — verify there is a retry mechanism or manual resend button, not just a failed status label

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Duplicate sends already delivered | HIGH | Acknowledge error to recipients (if critical); add idempotency immediately; audit all `processing` records |
| Messages missed due to Vercel timeout | MEDIUM | Manually trigger resend for `processing` records via admin action; add batch limit and cursor |
| GREEN API instance disconnected before event | MEDIUM | Re-authorize instance via dashboard QR scan; manually resend any failed messages; add health check |
| Timezone bug causes wrong send time | HIGH | Identify affected records; calculate correct UTC times; update records; resend if not yet delivered |
| Airtable quota exceeded mid-month | MEDIUM | Upgrade to Airtable Team plan ($20/month); implement server-side caching immediately; resume operations |
| Phone number format broke sends | LOW | Run normalization function over all contacts; verify with `checkWhatsapp`; resend failed messages |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Duplicate sends (three-state status) | Scheduling engine | Simulate crash mid-batch; confirm no record is re-sent |
| Vercel Hobby cron limit | Infrastructure / deployment setup | Confirm cron fires every 5 minutes in production, not just daily |
| Vercel function timeout | Scheduling engine | Send test batch of 50 messages; confirm no timeout; logs show batching |
| Airtable race condition (soft lock) | Scheduling engine | Fire two concurrent cron invocations; confirm no duplicate sends |
| Phone number normalization | Contact import / CRM | Import CSV with mixed formats; verify all stored as `972XXXXXXXXXX` |
| Timezone handling (UTC storage) | Campaign management | Create event at 19:00 Israel time; verify Airtable stores UTC equivalent; verify send fires at correct Israel time |
| GREEN API instance health check | GREEN API integration | Disconnect instance manually; confirm cron aborts and dashboard shows alert |
| Airtable quota exhaustion | Data access layer (first Airtable integration) | All reads behind server-side cache; no `NEXT_PUBLIC_AIRTABLE` token in env |
| RTL layout correctness | UI/Frontend phase | Test all forms and displays in Hebrew on mobile Chrome |
| No confirmation before broadcast | Campaign management UI | Verify two-step confirmation flow exists for all bulk send actions |

---

## Sources

- [GREEN API Rate Limiter documentation](https://green-api.com/en/docs/api/ratelimiter/) — confirmed 50 req/sec for sendMessage, 429 on exceed (HIGH confidence)
- [GREEN API Common Errors documentation](https://green-api.com/en/docs/api/common-errors/) — confirmed 400 chatId format, 429 rate limit (HIGH confidence)
- [GREEN API Phone Number Format for Israel](https://green-api.com/en/blog/how-to-correctly-enter-international-numbers-for-whatsapp/) — confirmed `972XXXXXXXXXX@c.us` format (HIGH confidence)
- [GREEN API WhatsApp Business messaging limits 2025](https://green-api.com/en/blog/2025/wa-buisness-change-its-messaging-limits/) — portfolio-level limits from Oct 2025 (HIGH confidence)
- [Airtable Rate Limits official docs](https://airtable.com/developers/web/api/rate-limits) — 5 req/sec per base, Personal Access Token 50 req/sec (HIGH confidence)
- [Airtable Managing API Call Limits](https://support.airtable.com/docs/managing-api-call-limits-in-airtable) — 1,000/month free, 100,000/month Team (HIGH confidence)
- [Vercel Cron Jobs documentation](https://vercel.com/docs/cron-jobs) — Hobby: 2 jobs, once daily max (HIGH confidence)
- [Vercel Function Timeouts](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out) — 10s default, 60s max (HIGH confidence)
- [Tailwind CSS RTL support](https://ryanschiang.com/tailwindcss-direction-rtl) — `dir="rtl"`, logical properties, `rtl:` variants (HIGH confidence)
- [WhatsApp bulk messaging ban risks 2025](https://whautomate.com/top-reasons-why-whatsapp-accounts-get-banned-in-2025-and-how-to-avoid-them/) — quality rating, warm-up, opt-in requirements (MEDIUM confidence)

---

*Pitfalls research for: WhatsApp Campaign Manager — Airtable + GREEN API + Next.js*
*Researched: 2026-03-17*
