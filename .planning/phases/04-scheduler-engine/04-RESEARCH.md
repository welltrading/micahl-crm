# Phase 4: Scheduler Engine — Research

**Researched:** 2026-03-18
**Domain:** Bree scheduler, GREEN API v2, Airtable idempotency, broadcast UI
**Confidence:** HIGH (core stack), MEDIUM (GREEN API rate behavior in practice)

---

## Summary

Phase 4 wires together three existing pieces — the Bree process (declared in `src/scheduler/index.ts` but has no jobs yet), the Airtable ScheduledMessages table (built in Phase 3 with `status`, `שליחה בשעה`, `נשלח בשעה` fields), and the GREEN API (credentials already in `.env.local.example` as `GREEN_API_INSTANCE_ID` / `GREEN_API_TOKEN`). The scheduler job file must be compiled JavaScript (Bree runs worker threads from `.js` files), so the TypeScript source lives in `src/scheduler/jobs/` and gets compiled alongside the rest of the app.

The idempotency mechanism is status-based: `pending → sending → sent/failed`. The `sending` state is the lock: the scheduler marks a message `בשליחה` before calling GREEN API, so a concurrent tick won't pick it up. If the process crashes mid-send, the message stays stuck in `בשליחה` — the plan must decide whether to auto-reset these on boot (recommended) or leave them for manual recovery.

Broadcast (MSG-04) is a Server Action: given a campaign ID and a message, it fetches all enrollments for that campaign and calls a `sendWhatsApp()` helper once per contact. There is no queueing through ScheduledMessages for broadcasts — they fire immediately through a loop with a delay between each send to respect GREEN API's 500ms minimum.

INFRA-05 (GREEN API status badge) uses `GET /getStateInstance/` which returns `stateInstance: "authorized" | "notAuthorized" | "blocked" | "sleepMode" | "starting" | "yellowCard"`. The Settings page (`src/app/hagdarot/page.tsx`) already shows GREEN API setup instructions — the status indicator is a small addition there.

**Primary recommendation:** Compile scheduler TypeScript jobs to `dist/scheduler/jobs/`, point Bree root at that compiled directory, write the `send-messages` job as a self-contained CommonJS worker that imports Airtable helpers and the GREEN API fetch wrapper. Status transitions in Airtable are the idempotency mechanism — no external lock store needed.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MSG-01 | Bree scheduler runs every minute, checks pending messages, sends via GREEN API | Bree 9.2.9 already installed; `src/scheduler/index.ts` awaiting job registration; `{ name: 'send-messages', interval: '1m' }` pattern confirmed |
| MSG-02 | Idempotency — pending→sending→sent/failed prevents double-send | Status field `'סטטוס'` with `'בשליחה'` choice exists in Airtable schema; filterByFormula on `ממתינה` + immediate update to `בשליחה` is the lock |
| MSG-03 | Phone numbers normalized to `972XXXXXXXXXX@c.us` before sending | `normalizePhone()` in `src/lib/airtable/phone.ts` produces `972XXXXXXXXXX`; append `@c.us` for GREEN API chatId |
| MSG-04 | Broadcast — one-off message to all enrollments for a campaign | Server Action: `getContactEnrollments(campaignId)` → contacts → loop with delay; no ScheduledMessages records created |
| INFRA-04 | Webhook endpoint already allows MAKE.com to add contacts | Already complete (Phase 2) — only the traceability row needs updating |
| INFRA-05 | GREEN API connection status visible in dashboard | `GET /getStateInstance/` returns `stateInstance`; add to `/hagdarot` settings page as a server component status badge |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| bree | 9.2.9 (installed) | Persistent cron-style scheduler with worker threads | Already in package.json; Railway persistent process already configured |
| node-fetch / native fetch | Node 18+ built-in | Call GREEN API HTTP endpoints | No extra dependency needed; Node 18 has global fetch |
| airtable | 0.12.2 (installed) | Read/write Airtable ScheduledMessages and MessageLog | Already in service layer |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @breejs/ts-worker | optional | Run TypeScript jobs directly without compile step | Only if compilation is too complex; adds ts-node dependency |

**Decision: compile approach (not ts-worker).** The project already has a `tsconfig.json` and `dist/` is the standard output. Compiled `.js` worker files are more predictable and faster to start than ts-node transpilation. The `scheduler` npm script already runs `node src/scheduler/index.js` — so the compile output must match that path.

**Installation:** No new packages needed. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── scheduler/
│   ├── index.ts          # Bree instance — ADD job registration here
│   └── jobs/
│       └── send-messages.ts  # NEW: worker thread job
├── lib/
│   ├── airtable/
│   │   ├── green-api.ts      # NEW: GREEN API client (fetch wrapper)
│   │   ├── message-log.ts    # NEW: MessageLog Airtable service
│   │   └── scheduled-messages.ts  # EXTEND: add getPendingMessages, markSending, markSent, markFailed
│   └── ...
└── app/
    ├── kampanim/
    │   └── actions.ts        # EXTEND: add broadcastAction
    └── hagdarot/
        └── page.tsx          # EXTEND: add GREEN API status indicator
```

### Pattern 1: Bree Job Registration (interval every 1 minute)
**What:** Register the `send-messages` job in the Bree instance with a 1-minute interval.
**When to use:** All recurring scheduler jobs follow this pattern.
**Example:**
```typescript
// src/scheduler/index.ts
import Bree from 'bree';
import path from 'path';

const bree = new Bree({
  root: path.join(__dirname, 'jobs'),
  jobs: [
    {
      name: 'send-messages',
      interval: '1m',
    },
  ],
});

bree.start().then(() => {
  console.log('Bree scheduler started — send-messages job active');
});
```
Note: `__dirname` works because the compiled output is CommonJS (`.js`). The jobs directory must exist at `dist/scheduler/jobs/`.

### Pattern 2: Idempotent Send Loop (pending → sending → sent/failed)
**What:** Fetch all `ממתינה` messages whose `שליחה בשעה` is in the past, immediately update each to `בשליחה` before calling GREEN API, then update to `נשלחה` or `נכשלה` based on result.
**When to use:** Every tick of the scheduler job.
**Example:**
```typescript
// src/scheduler/jobs/send-messages.ts (compiled to .js)
// This is a Bree worker thread — no parentPort needed for fire-and-forget jobs

async function run() {
  const now = new Date().toISOString();

  // 1. Fetch all pending messages due now
  const due = await getPendingMessagesDue(now);
  if (due.length === 0) return;

  for (const msg of due) {
    // 2. Claim the message by marking it 'בשליחה' BEFORE sending
    //    — concurrent ticks won't pick up a message in 'בשליחה' state
    await markMessageSending(msg.id);

    try {
      // 3. Get the contact's phone number
      const contact = await getContactById(msg.contact_id[0]);
      if (!contact) throw new Error('Contact not found');

      const chatId = normalizePhone(contact.phone) + '@c.us';

      // 4. Send via GREEN API
      const result = await sendWhatsAppMessage(chatId, msg.message_content);

      // 5. Mark sent + log
      await markMessageSent(msg.id);
      await createMessageLogEntry({
        scheduled_message_id: msg.id,
        contact_id: msg.contact_id[0],
        campaign_id: msg.campaign_id[0],
        status: 'sent',
        green_api_response: result.idMessage,
      });
    } catch (err) {
      // 6. Mark failed + log error
      await markMessageFailed(msg.id);
      await createMessageLogEntry({
        scheduled_message_id: msg.id,
        contact_id: msg.contact_id[0],
        campaign_id: msg.campaign_id[0],
        status: 'failed',
        error_message: String(err),
      });
    }
  }
}

run().catch(console.error);
```

### Pattern 3: Airtable Filter for Due Messages
**What:** Query ScheduledMessages where status is 'ממתינה' AND send_at is in the past.
**When to use:** In `getPendingMessagesDue()`.
**Example:**
```typescript
// Airtable filterByFormula for pending messages due now
const formula = `AND(
  {סטטוס} = 'ממתינה',
  IS_BEFORE({שליחה בשעה}, NOW())
)`;
```
Note: `שליחה בשעה` is the UTC datetime field in Airtable. The Airtable `NOW()` function returns UTC time, matching our stored UTC values.

### Pattern 4: GREEN API Send Message
**What:** POST to GREEN API sendMessage endpoint.
**When to use:** Whenever a WhatsApp message needs to be sent.
**Example:**
```typescript
// src/lib/airtable/green-api.ts
const GREEN_API_URL = process.env.GREEN_API_URL ?? 'https://api.green-api.com';
const INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID!;
const TOKEN = process.env.GREEN_API_TOKEN!;

export async function sendWhatsAppMessage(
  chatId: string,  // e.g. "972501234567@c.us"
  message: string,
): Promise<{ idMessage: string }> {
  const url = `${GREEN_API_URL}/waInstance${INSTANCE_ID}/sendMessage/${TOKEN}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GREEN API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<{ idMessage: string }>;
}

export async function getGreenApiState(): Promise<string> {
  const url = `${GREEN_API_URL}/waInstance${INSTANCE_ID}/getStateInstance/${TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) return 'unknown';
  const data = await res.json() as { stateInstance: string };
  return data.stateInstance;
}
```

### Pattern 5: Phone Normalization for GREEN API
**What:** `normalizePhone()` returns `972XXXXXXXXXX`. Append `@c.us` for GREEN API chatId.
**When to use:** Always, immediately before sending.
**Example:**
```typescript
// normalizePhone is already in src/lib/airtable/phone.ts
import { normalizePhone } from '@/lib/airtable/phone';

const chatId = normalizePhone(contact.phone) + '@c.us';
// e.g. "972501234567@c.us"
```

### Pattern 6: Broadcast Server Action
**What:** A Server Action that sends an immediate message to all enrollments of a campaign.
**When to use:** When Michal clicks "שלח broadcast" in CampaignSheet.
**Example:**
```typescript
// src/app/kampanim/actions.ts
export async function broadcastAction(
  campaignId: string,
  messageContent: string,
): Promise<{ ok: true; sent: number; failed: number } | { error: string }> {
  const enrollments = await getContactEnrollments(campaignId);
  let sent = 0, failed = 0;

  for (const enrollment of enrollments) {
    const contact = await getContactById(enrollment.contact_id[0]);
    if (!contact) { failed++; continue; }

    try {
      const chatId = normalizePhone(contact.phone) + '@c.us';
      await sendWhatsAppMessage(chatId, messageContent);
      sent++;
    } catch {
      failed++;
    }

    // Respect GREEN API minimum 500ms delay between messages
    await delay(1000);
  }

  return { ok: true, sent, failed };
}
```

### Pattern 7: GREEN API Status Badge (INFRA-05)
**What:** Server component that fetches `stateInstance` from GREEN API and renders a status indicator.
**When to use:** In the Settings page (`/hagdarot`).
**Example:**
```typescript
// In src/app/hagdarot/page.tsx — server component, no 'use client' needed
const state = await getGreenApiState();
const isConnected = state === 'authorized';
// Render: green dot "מחובר" or red dot "מנותק"
```

### Pattern 8: Boot-time 'בשליחה' Recovery
**What:** On Bree startup, reset any messages stuck in `בשליחה` (from a previous crashed process) back to `ממתינה`.
**When to use:** Once in `src/scheduler/index.ts` before starting Bree.
**Example:**
```typescript
// Before bree.start():
await resetStuckSendingMessages();
// Finds all ScheduledMessages with סטטוס='בשליחה', updates them to 'ממתינה'
```

### Anti-Patterns to Avoid
- **Fetching contact details inside Airtable filter:** Get all pending messages first, then fetch contacts in a loop — don't try to join in a single formula.
- **Sending without claiming first:** Never call GREEN API before updating status to `בשליחה` — a concurrent tick will duplicate the send.
- **Filtering on `send_date` string instead of `שליחה בשעה` datetime:** The `שליחה בשעה` field is the UTC datetime; `תאריך שליחה` and `שעת שליחה` are local-display fields not suitable for scheduler comparisons.
- **Running Airtable client in a Bree worker thread with `server-only`:** The scheduler process is NOT Next.js — remove `import 'server-only'` from any module imported by scheduler jobs, or create separate scheduler-safe service functions.
- **Using TypeScript source paths in Bree root:** Bree loads `.js` files from its `root`. Point at the compiled `dist/` directory, not `src/`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recurring job timing | setTimeout loop | Bree with `interval: '1m'` | Already installed; handles process restart, worker thread isolation |
| WhatsApp message delivery | Any custom protocol | GREEN API `sendMessage` POST | This is the entire point — v2 API is the chosen transport |
| Phone format conversion | Custom regex | `normalizePhone()` + `@c.us` | Already exists and tested in `phone.ts` |
| Message queueing / rate limiting | Redis queue or BullMQ | GREEN API's built-in queue (FIFO, 500ms delay) | GREEN API has its own internal queue; messages sent to it go into that queue automatically |
| DST-safe scheduling | Manual offset arithmetic | `localIsraelToUTC()` in `timezone.ts` | Already built and TDD-verified in Phase 3 |

**Key insight:** GREEN API queues messages internally (FIFO, up to 24 hours). For broadcasts, submitting messages serially with a 1s delay in the Server Action is sufficient — no external queue needed. Phase 4 does not need Redis, BullMQ, or any queue library.

---

## Common Pitfalls

### Pitfall 1: `server-only` import crashes scheduler process
**What goes wrong:** Scheduler worker thread imports from `@/lib/airtable/scheduled-messages.ts` which starts with `import 'server-only'`. The `server-only` package throws at runtime if not in a Next.js server context.
**Why it happens:** The `server-only` guard is designed for Next.js, but Bree jobs run in a plain Node.js worker thread.
**How to avoid:** Create scheduler-specific service functions in a new file (e.g., `src/lib/airtable/scheduler-services.ts`) that does NOT import `server-only`, OR conditionally guard it. Import only from files that don't have `server-only`.
**Warning signs:** `Error: This module cannot be imported from a Client Component module.` in scheduler logs.

### Pitfall 2: Bree root points at TypeScript source, not compiled output
**What goes wrong:** `new Bree({ root: path.join(__dirname, 'jobs') })` in compiled JS resolves correctly (since `__dirname` for compiled `dist/scheduler/index.js` would be `dist/scheduler/`). But if `src/scheduler/index.ts` uses `__dirname` without being compiled, it points to `src/scheduler/jobs/` which contains `.ts` files Bree can't load.
**Why it happens:** Confusion between source and output paths.
**How to avoid:** Compile everything. Ensure `tsconfig.json` includes `src/scheduler/**` and the output lands in `dist/`. The `railway.toml` scheduler service runs `node src/scheduler/index.js` — this means the compiled output must be at `src/scheduler/index.js` OR `railway.toml` must be updated to point to `dist/`.
**Warning signs:** `Cannot find module` errors for job files on Railway.

**CRITICAL NOTE:** The current `railway.toml` runs `node src/scheduler/index.js`. This means compilation must output to `src/` (not `dist/`), OR `railway.toml` must be updated. The planner must decide — updating `railway.toml` to point to `dist/scheduler/index.js` is cleaner.

### Pitfall 3: Airtable status Hebrew values mismatched
**What goes wrong:** Airtable singleSelect values are Hebrew. The scheduler must use exact Hebrew strings: `'ממתינה'`, `'בשליחה'`, `'נשלחה'`, `'נכשלה'`. Using English (`'pending'`, `'sending'`) will silently fail (Airtable returns empty/errors for unknown select values).
**Why it happens:** Types in `types.ts` use English enums (`'pending' | 'sending' | 'sent' | 'failed'`) but Airtable stores Hebrew.
**How to avoid:** Always use the Hebrew string when writing to Airtable. The existing pattern in `scheduled-messages.ts` sets `'סטטוס': 'ממתינה'` on create. Follow the same pattern for `'בשליחה'`, `'נשלחה'`, `'נכשלה'`.
**Warning signs:** Messages stuck in `pending` even after the scheduler runs; Airtable update calls succeed but value doesn't change.

### Pitfall 4: Scheduler sends to per-campaign ScheduledMessages (no contact link yet)
**What goes wrong:** ScheduledMessages created in Phase 3 (via `saveMessagesAction`) are campaign-level templates. They have `קמפיין` linked but no `איש קשר` linked. The scheduler would need to cross-reference enrollments.
**Why it happens:** Phase 3 created campaign messages, not per-contact message instances.
**How to avoid:** The scheduler must: (1) fetch pending ScheduledMessages, (2) for each, fetch enrollments for that campaign, (3) send to each enrolled contact. Alternatively, the approach is to create per-contact ScheduledMessage records at enrollment time — but this is more complex and was not the Phase 3 design.

**DECISION NEEDED for planner:** The simplest approach that fits the existing schema is: scheduler fetches campaign-level ScheduledMessages with `סטטוס='ממתינה'`, then for each, reads `CampaignEnrollments` for that campaign, sends to each contact, then marks the ScheduledMessage as `נשלחה`. MessageLog gets one entry per contact. This avoids schema changes.

### Pitfall 5: GREEN API daily message limit
**What goes wrong:** GREEN API recommends max 200 messages/day on a personal number. Michal's campaigns may approach this limit with large enrollment lists.
**Why it happens:** WhatsApp's anti-spam rules on personal/non-Business API accounts.
**How to avoid:** For Phase 4 (v1), document the 200/day limit in the UI. A 1-second delay between messages in broadcasts respects the 500ms minimum. Do not send more than 200 contacts per campaign in v1.
**Warning signs:** GREEN API instance gets `yellowCard` or `blocked` stateInstance.

### Pitfall 6: `getContactEnrollments` is on `contacts.ts` which has no `server-only`
**What goes wrong:** `contacts.ts` does NOT have `import 'server-only'` at the top (confirmed by reading the file), but it imports `airtableBase` from `client.ts` which throws if `AIRTABLE_API_TOKEN` is not set. In the scheduler worker context, env vars may not be loaded.
**Why it happens:** Railway environment variables must be available in the scheduler service too.
**How to avoid:** Ensure Railway environment variables (`AIRTABLE_API_TOKEN`, `AIRTABLE_BASE_ID`, `GREEN_API_INSTANCE_ID`, `GREEN_API_TOKEN`) are set on the scheduler service, not just the web service.
**Warning signs:** `Error: AIRTABLE_API_TOKEN is not set` in scheduler logs.

---

## Code Examples

Verified patterns from official sources and project codebase:

### GREEN API sendMessage (confirmed from official docs)
```typescript
// Source: https://green-api.com/en/docs/api/sending/SendMessage/
// POST {{apiUrl}}/waInstance{{idInstance}}/sendMessage/{{apiTokenInstance}}
// Response: { idMessage: string }

const res = await fetch(
  `https://api.green-api.com/waInstance${INSTANCE_ID}/sendMessage/${TOKEN}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: '972501234567@c.us',  // personal chat: {number}@c.us
      message: 'שלום! תזכורת לאירוע שלנו מחר.',
    }),
  }
);
const { idMessage } = await res.json();
```

### GREEN API getStateInstance (confirmed from official docs)
```typescript
// Source: https://green-api.com/en/docs/api/account/GetStateInstance/
// GET {{apiUrl}}/waInstance{{idInstance}}/getStateInstance/{{apiTokenInstance}}
// Response: { stateInstance: 'authorized' | 'notAuthorized' | 'blocked' | 'sleepMode' | 'starting' | 'yellowCard' }

const res = await fetch(
  `https://api.green-api.com/waInstance${INSTANCE_ID}/getStateInstance/${TOKEN}`
);
const { stateInstance } = await res.json();
const isConnected = stateInstance === 'authorized';
```

### Bree job registration (confirmed from bree README)
```typescript
// Source: https://github.com/breejs/bree
import Bree from 'bree';
import path from 'path';

const bree = new Bree({
  root: path.join(__dirname, 'jobs'),  // points to compiled jobs directory
  jobs: [
    { name: 'send-messages', interval: '1m' },
  ],
});
await bree.start();
```

### Airtable filterByFormula for due messages
```typescript
// Source: project pattern from scheduled-messages.ts + Airtable formula docs
const records = await airtableBase('ScheduledMessages')
  .select({
    filterByFormula: `AND({סטטוס} = 'ממתינה', IS_BEFORE({שליחה בשעה}, NOW()))`,
  })
  .all();
```

### Airtable status update (Hebrew singleSelect)
```typescript
// Source: project pattern from scheduled-messages.ts
await airtableBase('ScheduledMessages').update(recordId, {
  'סטטוס': 'בשליחה',  // claim before sending
});

await airtableBase('ScheduledMessages').update(recordId, {
  'סטטוס': 'נשלחה',
  'נשלח בשעה': new Date().toISOString(),
});
```

### MessageLog creation
```typescript
// Source: types.ts MessageLog interface + setup-airtable.ts field names
// Fields: סטטוס (singleSelect: נשלחה/נכשלה), תגובת GREEN API, הודעת שגיאה
// Linked fields (manual setup): הודעה מתוזמנת → ScheduledMessages, איש קשר → Contacts, קמפיין → Campaigns

await airtableBase('MessageLog').create({
  'סטטוס': 'נשלחה',
  'תגובת GREEN API': idMessage,
  'הודעה מתוזמנת': [scheduledMessageId],  // linked record
  'איש קשר': [contactId],
  'קמפיין': [campaignId],
});
```

---

## Schema Reality Check

The current `ScheduledMessage` type (from `types.ts`) has a `contact_id: string[]` field. However, looking at how Phase 3 creates these records in `scheduled-messages.ts`, `createScheduledMessage()` does NOT set `איש קשר` — records are created without contact links. This means:

**Current state:** ScheduledMessages are campaign-level templates with no per-contact link.
**Scheduler approach:** Must query `CampaignEnrollments` to get contacts for each campaign, then send to each. The ScheduledMessage record tracks campaign-level status; MessageLog tracks per-contact delivery.

This is the correct v1 approach — it keeps Phase 3 simple and Phase 4 handles the fan-out.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vercel cron (jitter ±30s) | Bree on Railway (persistent, precise) | Project decision Phase 1 | `half_hour` timing works correctly |
| GREEN API v1 | GREEN API v2 only | March 2026 (v1 deprecated) | Must use v2 endpoints |
| External Redis/BullMQ for queue | GREEN API built-in FIFO queue | N/A (never planned) | No extra infra needed |

**Deprecated/outdated:**
- GREEN API v1 endpoints: deprecated March 2026 — v2 is what the project uses
- `node src/scheduler/index.js` as Railway start command: may need updating to `node dist/scheduler/index.js` after compilation is set up

---

## Open Questions

1. **Compilation output path for scheduler**
   - What we know: `railway.toml` runs `node src/scheduler/index.js`; TypeScript source is in `src/scheduler/index.ts`
   - What's unclear: Does the build step compile to `src/` or `dist/`? Next.js `next build` does not compile non-Next.js TypeScript files to `src/`.
   - Recommendation: Add a `build:scheduler` script that compiles `src/scheduler/**` to `dist/scheduler/`, update `railway.toml` to run `node dist/scheduler/index.js`. The existing package.json already has `"build:scheduler": "tsc --project tsconfig.json --outDir dist"` — this is the right approach.

2. **Per-contact vs campaign-level ScheduledMessages**
   - What we know: Phase 3 creates campaign-level ScheduledMessages (no contact link). The `contact_id` field exists in the schema but is not set.
   - What's unclear: Should the scheduler fan out to contacts at send time, or should enrollment create per-contact records?
   - Recommendation: Fan-out at send time (simpler, no data explosion). The scheduler reads campaign ScheduledMessages + CampaignEnrollments, sends to each contact, logs per-contact in MessageLog.

3. **Stuck 'בשליחה' recovery**
   - What we know: If the scheduler crashes after marking `בשליחה` but before marking `נשלחה`/`נכשלה`, messages are stuck.
   - What's unclear: How long before a message is considered stuck? (1 minute is a safe threshold since jobs run every minute)
   - Recommendation: On Bree startup, reset all `בשליחה` messages older than 2 minutes to `ממתינה`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30 + ts-jest 29 |
| Config file | `package.json` (jest key) |
| Quick run command | `npm test -- --testPathPattern="green-api\|scheduler"` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MSG-01 | `getPendingMessagesDue()` returns messages with status=pending and send_at in past | unit | `npm test -- --testPathPattern="scheduler-services.test"` | ❌ Wave 0 |
| MSG-02 | `markMessageSending()` updates status to 'בשליחה'; subsequent getPendingMessagesDue doesn't return it | unit | `npm test -- --testPathPattern="scheduler-services.test"` | ❌ Wave 0 |
| MSG-03 | `normalizePhone('050-123-4567') + '@c.us'` === `'972501234567@c.us'` | unit | `npm test -- --testPathPattern="phone.test"` | ✅ exists |
| MSG-04 | `broadcastAction` calls sendWhatsAppMessage once per enrolled contact | unit | `npm test -- --testPathPattern="actions.test"` | ❌ Wave 0 |
| INFRA-05 | `getGreenApiState()` returns 'authorized' when API responds correctly | unit (mocked fetch) | `npm test -- --testPathPattern="green-api.test"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --testPathPattern="scheduler-services\|green-api"`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/airtable/__tests__/scheduler-services.test.ts` — covers MSG-01, MSG-02
- [ ] `src/lib/airtable/__tests__/green-api.test.ts` — covers INFRA-05 (mocked fetch)
- [ ] `src/app/kampanim/__tests__/broadcast.test.ts` — covers MSG-04

*(MSG-03 phone normalization: existing `phone.test.ts` already tests `normalizePhone` — only the `@c.us` append needs testing, can be added to existing file)*

---

## Sources

### Primary (HIGH confidence)
- [GREEN API sendMessage docs](https://green-api.com/en/docs/api/sending/SendMessage/) — endpoint URL, chatId format, response structure
- [GREEN API getStateInstance docs](https://green-api.com/en/docs/api/account/GetStateInstance/) — stateInstance values (authorized/notAuthorized/blocked/sleepMode/starting/yellowCard)
- [GREEN API send delay docs](https://green-api.com/en/docs/api/send-messages-delay/) — minimum 500ms delay, FIFO queue
- [Bree GitHub README](https://github.com/breejs/bree) — job file structure, workerData pattern, interval syntax
- Project codebase: `src/scheduler/index.ts`, `src/lib/airtable/`, `scripts/setup-airtable.ts`, `railway.toml`, `package.json`

### Secondary (MEDIUM confidence)
- [GREEN API ban protection docs](https://green-api.com/en/docs/faq/how-to-protect-number-from-ban/) — max 200 messages/day recommendation, 15s+ delay for mass sending
- [GREEN API v2 deprecation notice](https://green-api.com/en/blog/) — v1 deprecated March 2026, confirmed by STATE.md

### Tertiary (LOW confidence)
- WebSearch results on Bree TypeScript compilation — specific compile path setup needs verification; using the existing `build:scheduler` script pattern is the right starting point

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Bree 9.2.9 and GREEN API v2 confirmed from official sources and package.json
- Architecture: HIGH — based on actual codebase state (existing schema, scheduler skeleton, service layer)
- Pitfalls: HIGH for `server-only` and Hebrew status values (verified from codebase); MEDIUM for Railway compilation path (needs testing)
- GREEN API rate limits: MEDIUM — 500ms minimum confirmed from docs; 200/day is a recommendation not a hard limit

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable stack; GREEN API docs unlikely to change in 30 days)
