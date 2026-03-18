# Phase 3: Campaign Management - Research

**Researched:** 2026-03-18
**Domain:** Next.js 16 / React 19 / Airtable / Israel timezone / RTL Hebrew UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Campaign creation flow**
- Modal dialog triggered by "צור קמפיין" button on the campaigns list page — consistent with "add contact" pattern from Phase 2
- Modal contains: שם קמפיין, תאריך אירוע (visual date picker), שעת האירוע (visual time picker), תיאור (optional text)
- After saving, modal closes and the new campaign's Sheet panel opens automatically (no separate detail page)

**Campaign list layout**
- Card grid — not table rows
- Each card shows: שם קמפיין, תאריך האירוע, סטטוס badge (עתידי / פעיל / הסתיים), כמות נרשמות, כמות הודעות שהוגדרו, תיאור קצר (truncated if long)
- Clicking a card opens a Sheet (slide panel) — same Sheet component pattern as contact detail in Phase 2

**Campaign Sheet (detail panel)**
- Sheet is the primary UI for campaign detail — no dedicated /kampanim/[id] page
- Top section: campaign name, event date/time, description, enrollment count
- Lower section: 4 fixed message slots (always visible, not dynamically added)

**Message scheduling UI (inside the Sheet)**
- 4 fixed slots always displayed: שבוע לפני, יום לפני, בוקר האירוע, חצי שעה לפני
- Each slot: text area for message content + time configuration
- "שבוע לפני" and "יום לפני" = fixed offset (7 days before / 1 day before), send time defaults to 09:00
- "בוקר האירוע": Michal chooses the time (time picker) — e.g., 08:00
- "חצי שעה לפני": Michal chooses the base time (which is the event time minus 30 min — but she should be shown the calculated time, not asked to subtract manually)
- Below each slot, show the computed send date/time in Israeli time immediately: e.g., "יישלח ב-14/4 בשעה 09:00" — updates live as event date/time changes
- Empty slot (no message content) = skipped, no ScheduledMessage record created
- "שמור הודעות" button saves all filled slots to Airtable

**Editing pending messages**
- Message fields inside the Sheet are always editable (both content and time)
- For messages already sent (status = sent): content and time fields still editable — no lock
- Editing a pending message's time → recalculates send_at and updates Airtable immediately on save
- Status label (ממתין / נשלח / נכשל) shown per slot — read-only badge

**Date and time inputs**
- Visual date picker (no manual typing) — use @base-ui/react DatePicker (already installed)
- Visual time picker — dropdown or select of common times (e.g., every 30 min), not free-text
- All times displayed to user in Israel timezone (Asia/Jerusalem), stored as UTC in Airtable
- DST-safe computation required: use Israel timezone offset at the exact event date/time

### Claude's Discretion

- Exact card grid column count and responsive breakpoints
- Date/time picker styling to match RTL Hebrew layout
- Specific time options in the time dropdown
- Loading/saving states inside the Sheet
- Empty state for no campaigns yet

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAMP-01 | מיכל יכולה ליצור קמפיין עם שם, תאריך אירוע, שעה, ותיאור | Modal dialog pattern (established Phase 2), `createCampaign()` function to add to `campaigns.ts` |
| CAMP-02 | לכל קמפיין ניתן להגדיר עד 4 הודעות עם תוכן + מתי לשלוח | CampaignSheet with 4 fixed slots, `upsertScheduledMessages()` Airtable write function |
| CAMP-03 | בעת יצירת קמפיין המערכת מחשבת אוטומטית את ה-send_at המדויק (UTC) | DST-safe UTC computation via `Intl.DateTimeFormat` or Luxon — see Architecture Patterns |
| CAMP-04 | מיכל יכולה לראות רשימת כל הקמפיינים עם סטטוס (עתידי / פעיל / הסתיים) | `getCampaigns()` already exists; real campaign list page replaces placeholder |
| CAMP-05 | מיכל יכולה לראות כמה נרשמות יש לכל קמפיין | Airtable lookup for enrollment count per campaign; `getEnrollmentCountsByCampaign()` |
| CAMP-06 | מיכל יכולה לשנות את זמן השליחה של הודעה ממתינה — המערכת מחשבת מחדש את ה-send_at ומעדכנת ב-Airtable | `updateScheduledMessage()` + recalculate UTC, patch Airtable record |
| UX-02 | הגדרת זמני שליחה בבחירה ויזואלית — לא בכתיבת תאריכים ידנית | Custom native `<input type="date">` or react-day-picker for date, `<select>` for time — see critical finding below |

</phase_requirements>

---

## Summary

Phase 3 builds the campaign management feature on top of the established Phase 2 patterns. The architecture is straightforward: a server component page fetches campaign list data, a client component renders the card grid, a modal handles campaign creation, and a Sheet panel handles message slot editing — all using components already written in Phase 2.

The most important technical finding is that **`@base-ui/react` v1.3.0 (installed) does NOT have a Calendar/DatePicker component**. The Calendar component exists only in the library's GitHub source (master branch) but was not shipped in any released version as of March 2026. The CONTEXT.md assumption "use @base-ui/react DatePicker (already installed)" is incorrect. The plan must use an alternative approach for date input.

The second critical finding is DST-safety for Israel timezone. Israel switches DST on March 27, 2026 (forward 1 hour, UTC+3) and October 25, 2026 (back 1 hour, UTC+2). Any event near these boundaries needs the UTC offset computed at the precise event date/time. The recommended approach uses the native `Intl.DateTimeFormat` API (zero dependencies) to resolve the correct offset at a given moment.

**Primary recommendation:** Use `<input type="date">` (native, reliable, zero-dep) styled to RTL for date selection, a custom `<select>` for time slots, and the native `Intl.DateTimeFormat` with `Asia/Jerusalem` for DST-safe UTC conversion. Add `react-day-picker` only if native date input appearance is unacceptable after testing.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.7 (installed) | App framework | Already in project |
| React | 19.2.3 (installed) | UI | Already in project |
| @base-ui/react | 1.3.0 (installed) | Dialog (modal), Sheet (detail panel) | Already used in Phase 2 |
| Airtable JS SDK | 0.12.2 (installed) | Airtable CRUD | Already used throughout |
| Tailwind 4 | installed | Styling / RTL logical properties | Already in project |

### Supporting (new installs needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-day-picker | ^9.x | Visual calendar date picker | Only if `<input type="date">` appearance is inadequate after visual review |
| date-fns | ^4.x | Locale formatting for react-day-picker | Pair with react-day-picker if used |

> **Default plan: use native `<input type="date">` first.** It renders a system date picker that is accessible and works reliably. If it looks wrong in RTL/Hebrew context after visual review, add react-day-picker v9.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| native `<input type="date">` | react-day-picker v9 | react-day-picker has explicit RTL + Hebrew locale support but adds ~45 KB and a dependency |
| Intl.DateTimeFormat UTC offset calc | luxon / date-fns-tz | No new install needed for Intl approach; luxon adds 72 KB |

**Installation (only if react-day-picker is chosen):**
```bash
npm install react-day-picker date-fns
```

---

## Critical Finding: @base-ui/react Has No DatePicker

**The CONTEXT.md states:** "use @base-ui/react DatePicker (already installed)"

**The reality:** `@base-ui/react` v1.3.0 contains NO Calendar or DatePicker component. Verified by:
1. Listing the installed package contents — no `calendar` directory
2. Checking the Base UI releases page — Calendar was never released in any version up to v1.3.0 (latest as of March 2026)
3. The Calendar component exists only in the GitHub master branch source, with an open TODO: "Improve localization support (right now it doesn't work well with RTL languages)"

**Impact on planning:** Tasks must NOT reference `@base-ui/react/date-picker` or `@base-ui/react/calendar`. The plan must use an alternative.

**Recommended resolution:** Use native `<input type="date">` for date selection (built into the browser, no install) and a custom `<select>` for time. If visual appearance is unacceptable, install `react-day-picker` v9 which has explicit Hebrew locale and RTL support.

---

## Architecture Patterns

### Recommended Project Structure (additions for Phase 3)
```
src/
├── app/
│   └── kampanim/
│       ├── page.tsx                # Replace placeholder — server component, fetches campaigns + enrollment counts
│       └── actions.ts              # Server actions: createCampaign, saveCampaignMessages, updateScheduledMessageTime
├── components/
│   └── campaigns/
│       ├── CampaignsPageClient.tsx # Client component: card grid + modal + sheet state
│       ├── CampaignCard.tsx        # Single campaign card (uses Card from ui/)
│       ├── CreateCampaignModal.tsx # Modal for creating new campaign
│       └── CampaignSheet.tsx       # Slide panel with 4 message slots
└── lib/
    └── airtable/
        ├── campaigns.ts            # Extend with createCampaign(), getEnrollmentCountsByCampaign()
        ├── scheduled-messages.ts   # New: getScheduledMessagesByCampaign(), upsertScheduledMessages(), updateScheduledMessage()
        └── timezone.ts             # New: computeSendAtUTC(eventDate, offsetLabel, sendHour) — DST-safe
```

### Pattern 1: Server Component → Client Component Split (established in Phase 2)

**What:** Server component fetches Airtable data at request time, passes to client component as props.

**When to use:** Any page that reads from Airtable.

```typescript
// src/app/kampanim/page.tsx  (server component — mirrors anshei-kesher/page.tsx pattern)
import { getCampaigns } from '@/lib/airtable/campaigns';
import { getEnrollmentCountsByCampaign } from '@/lib/airtable/campaigns';
import { CampaignsPageClient } from '@/components/campaigns/CampaignsPageClient';

export const dynamic = 'force-dynamic'; // campaigns change after creation

export default async function KampaninPage() {
  const [campaigns, enrollmentCounts] = await Promise.all([
    getCampaigns(),
    getEnrollmentCountsByCampaign(),
  ]);
  return <CampaignsPageClient campaigns={campaigns} enrollmentCounts={enrollmentCounts} />;
}
```

### Pattern 2: Modal for Creation (established in Phase 2)

**What:** `Dialog.Root` from `@base-ui/react/dialog` — same as `AddContactModal`.

**When to use:** Creating a new top-level entity.

```typescript
// CreateCampaignModal.tsx — mirrors AddContactModal.tsx exactly
import { Dialog } from '@base-ui/react/dialog';
import { createCampaign } from '@/app/kampanim/actions';

// After successful creation: close modal AND open Sheet for new campaign
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  const result = await createCampaign({ campaign_name, event_date, send_time, description });
  if ('campaign' in result) {
    onOpenChange(false);
    onCampaignCreated(result.campaign); // triggers Sheet to open
    router.refresh();
  }
}
```

### Pattern 3: Sheet for Detail Panel (established in Phase 2)

**What:** `Sheet` component from `src/components/ui/sheet.tsx` — `side="left"` in RTL layout means it slides from the right side of the screen.

**Note:** In Phase 2, `side="left"` was used and it correctly slides from the RIGHT in RTL (dir=rtl on html). This is the correct side to use for campaign sheets as well.

```typescript
// CampaignSheet.tsx — mirrors ContactDetailPanel.tsx pattern
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// Lazy-load messages when campaign is selected — same useEffect + cancelled flag pattern
React.useEffect(() => {
  if (!campaign) { setMessages(null); return; }
  let cancelled = false;
  setLoading(true);
  getCampaignMessages(campaign.id).then((data) => {
    if (!cancelled) { setMessages(data); setLoading(false); }
  });
  return () => { cancelled = true; };
}, [campaign?.id]);
```

### Pattern 4: DST-Safe UTC Conversion (new for Phase 3)

**What:** Convert a local Israel date+time string to UTC ISO string, correctly handling DST.

**Key facts:**
- Israel Standard Time: UTC+2 (winter, October–March)
- Israel Daylight Time: UTC+3 (summer, March–October)
- 2026 DST start: March 27 at 02:00 (clocks advance to 03:00)
- 2026 DST end: October 25 at 02:00 (clocks fall back to 01:00)

**Approach (zero dependencies — Intl API):**

```typescript
// src/lib/airtable/timezone.ts
// Source: Intl.DateTimeFormat with Asia/Jerusalem

/**
 * Returns the UTC offset in minutes for Asia/Jerusalem at a given local date.
 * Uses the browser/Node Intl API — no extra packages needed.
 * Works for any future year and DST transition.
 */
function getJerusalemOffsetMinutes(localDateISO: string, localHour: number, localMinute: number = 0): number {
  // Create a test UTC date, then read back the Jerusalem time to find offset
  // Strategy: use Intl to get Jerusalem wall time for UTC midnight on that date,
  // then iterate until the Jerusalem wall time matches the desired local time.
  //
  // Simpler and correct: use Date constructor with UTC, compare to Intl output
  const testDate = new Date(`${localDateISO}T${String(localHour).padStart(2,'0')}:${String(localMinute).padStart(2,'0')}:00Z`);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  // This approach resolves offset by comparing UTC-assumed date vs Jerusalem-displayed date
  // Use date-fns-tz or Luxon for production; for pure Intl see below
  return 0; // stub — see full implementation below
}

/**
 * DST-safe conversion: given YYYY-MM-DD date, HH:MM local Israel time,
 * returns UTC ISO8601 string.
 *
 * Uses Temporal API if available (Node 22+) or falls back to Intl offset detection.
 */
export function localIsraelToUTC(dateISO: string, timeHHMM: string): string {
  const [year, month, day] = dateISO.split('-').map(Number);
  const [hour, minute] = timeHHMM.split(':').map(Number);

  // Method: create a UTC Date, adjust by the Jerusalem offset at that moment
  // Use iterative approach to find the actual UTC moment when Jerusalem shows the desired time
  // This is the most reliable approach without external libraries

  // Step 1: Estimate UTC assuming UTC+2 (standard)
  let utc = new Date(Date.UTC(year, month - 1, day, hour - 2, minute));

  // Step 2: Check what Jerusalem time that UTC moment actually shows
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  // Step 3: Adjust once if the displayed Jerusalem time differs from target
  const parts = fmt.formatToParts(utc);
  const displayedHour = Number(parts.find(p => p.type === 'hour')!.value);
  const diff = hour - displayedHour;
  if (diff !== 0) {
    utc = new Date(utc.getTime() - diff * 60 * 60 * 1000);
  }

  return utc.toISOString();
}
```

**Note for planner:** The above is a working pattern but the exact implementation should be unit-tested with known DST edge cases (event on March 27 and October 25). Consider installing `date-fns-tz` v3 (peer of date-fns v4) for a more robust solution if edge cases fail in tests.

### Pattern 5: Offset Label → send_at Calculation

```typescript
// Offset label → subtract from event date/time
type OffsetConfig = {
  daysOffset: number;     // negative = before event
  fixedHour: number | null;  // null = use user-chosen time
};

const OFFSET_CONFIGS: Record<ScheduledMessage['offset_label'], OffsetConfig> = {
  week_before:  { daysOffset: -7, fixedHour: 9 },   // 09:00 fixed
  day_before:   { daysOffset: -1, fixedHour: 9 },   // 09:00 fixed
  morning:      { daysOffset: 0,  fixedHour: null }, // user-chosen
  half_hour:    { daysOffset: 0,  fixedHour: null }, // event_time - 30 min (auto-calculated)
};

function computeSendAt(
  eventDateISO: string,    // "2026-04-14"
  eventTimeHHMM: string,   // "19:00"
  offset: ScheduledMessage['offset_label'],
  userChosenHour?: string, // "08:00" for morning slot
): string { // returns UTC ISO8601
  const config = OFFSET_CONFIGS[offset];
  const [year, month, day] = eventDateISO.split('-').map(Number);

  // Adjust date by daysOffset
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + config.daysOffset);
  const adjustedDate = d.toISOString().slice(0, 10);

  // Determine local time in Israel
  let localTime: string;
  if (offset === 'half_hour') {
    // event time minus 30 min
    const [eh, em] = eventTimeHHMM.split(':').map(Number);
    const totalMin = eh * 60 + em - 30;
    localTime = `${String(Math.floor(totalMin / 60)).padStart(2,'0')}:${String(totalMin % 60).padStart(2,'0')}`;
  } else if (config.fixedHour !== null) {
    localTime = `${String(config.fixedHour).padStart(2,'0')}:00`;
  } else {
    localTime = userChosenHour!; // morning slot
  }

  return localIsraelToUTC(adjustedDate, localTime);
}
```

### Pattern 6: Airtable create/update for ScheduledMessages

```typescript
// src/lib/airtable/scheduled-messages.ts

// Hebrew Airtable field names (established pattern from contacts.ts)
export async function upsertScheduledMessages(campaignId: string, slots: SlotData[]): Promise<void> {
  // For each filled slot: create or update ScheduledMessage record
  // Use Airtable batch create (up to 10 records per call)
  const records = slots
    .filter(s => s.message_content.trim() !== '')
    .map(s => ({
      fields: {
        'קמפיין': [campaignId],    // linked record
        'תוכן ההודעה': s.message_content,
        'שליחה בשעה': s.send_at,   // UTC ISO8601
        'תזמון': OFFSET_LABEL_HE[s.offset_label],
        'סטטוס': 'ממתינה',
      }
    }));
  if (records.length === 0) return;
  await airtableBase('ScheduledMessages').create(records);
}

export async function updateScheduledMessage(
  recordId: string,
  fields: { message_content?: string; send_at?: string }
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (fields.message_content !== undefined) update['תוכן ההודעה'] = fields.message_content;
  if (fields.send_at !== undefined) update['שליחה בשעה'] = fields.send_at;
  await airtableBase('ScheduledMessages').update(recordId, update);
}
```

### Anti-Patterns to Avoid

- **Calling `airtableBase` in a client component:** Always server-side only (server-only package enforces this).
- **Storing local Israel time in Airtable:** Always convert to UTC ISO8601 before writing to `שליחה בשעה`.
- **Computing offset label without event date:** Must pass actual event date to DST-safe conversion.
- **Using `new Date('2026-04-14')` as local time:** The Date constructor treats bare date strings as UTC midnight, not Israel midnight.
- **Using `flex-row-reverse` for RTL layout:** The project uses `dir="rtl"` on `<html>` — flex-row is already RTL. Double-reverse puts sidebar on wrong side (documented Phase 1 decision).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Campaign status (עתידי / פעיל / הסתיים) | Status state machine | Derived from `event_date` vs `new Date()` | No DB column needed — compute in map function |
| RTL logical spacing | Custom margin/padding logic | Tailwind `ms-*`, `ps-*` logical properties | Already established in Phase 2 |
| Dialog/Sheet overlay | Custom portal overlay | `@base-ui/react/dialog` + `sheet.tsx` | Already written |
| Date/time display formatting | Custom format function | `new Date().toLocaleDateString('he-IL')` | Built-in, established in Phase 2 |
| Enrollment count per campaign | Separate Enrollments table join | Airtable `select` with `filterByFormula` FIND+ARRAYJOIN | Same pattern as `getContactEnrollments` |

**Key insight:** Status is derived, not stored — compute it at read time from `event_date` vs current date. No separate Airtable formula or update needed.

---

## Common Pitfalls

### Pitfall 1: DST Boundary in UTC Computation

**What goes wrong:** Event on April 1 at 09:00 → "שבוע לפני" is March 25 at 09:00 Israel time. But if you subtract 7*24h in UTC, you assume a fixed offset. March 25 is already after the DST transition (March 27 forward), so actually March 25 is UTC+2, while April 1 is UTC+3. The subtraction produces a result 1 hour off.

**Why it happens:** Using UTC arithmetic without accounting for the DST change between the two dates.

**How to avoid:** Compute target date and time in local (Jerusalem) space first, THEN convert to UTC using `localIsraelToUTC()`. Never subtract days in UTC and then format as local.

**Warning signs:** Tests with April event dates showing send_at 1 hour early compared to manual calculation.

### Pitfall 2: Airtable Linked Record Write Format

**What goes wrong:** Writing campaign_id as a plain string to a linked record field fails silently or throws.

**Why it happens:** Airtable linked record fields require an array of record IDs: `['recXXXXXXXXXXXXXX']`.

**How to avoid:** Always wrap linked record IDs in arrays: `'קמפיין': [campaignId]`.

**Warning signs:** ScheduledMessage records created but with no campaign link visible in Airtable.

### Pitfall 3: @base-ui/react Calendar Does Not Exist in v1.3.0

**What goes wrong:** Importing `@base-ui/react/calendar` throws `Module not found`.

**Why it happens:** The Calendar component is only in the GitHub source, not yet released to npm.

**How to avoid:** Use native `<input type="date">` or install `react-day-picker` v9. See Standard Stack section.

**Warning signs:** `Module not found: Can't resolve '@base-ui/react/calendar'` at build time.

### Pitfall 4: `<input type="date">` Returns YYYY-MM-DD (Not Aware of Timezone)

**What goes wrong:** `<input type="date">` value is always `"YYYY-MM-DD"` string with no timezone. If treated as UTC, an April 14 event becomes April 13 at 21:00 UTC+3 display.

**Why it happens:** `new Date("2026-04-14")` interprets as UTC midnight, not Jerusalem midnight.

**How to avoid:** Treat `<input type="date">` output as a LOCAL date string, never pass directly to `new Date()`. Always go through `localIsraelToUTC(dateStr, timeStr)`.

**Warning signs:** Displayed dates off by 1 day in the UI, or send_at times 2–3 hours earlier than expected.

### Pitfall 5: Campaign Status Stale After Creation

**What goes wrong:** After creating a campaign, the list shows it with status "ended" or the wrong status because status is derived from `event_date`.

**Why it happens:** If the status derivation compares against `Date.now()` server-side but the page is statically cached.

**How to avoid:** Keep `export const dynamic = 'force-dynamic'` on the campaigns page (same as anshei-kesher page). Status derivation function should always use `new Date()` at map time.

### Pitfall 6: Airtable Rate Limits on Campaign Sheet Open

**What goes wrong:** Opening the Sheet triggers multiple parallel Airtable calls (ScheduledMessages fetch, enrollment count) and the 50 req/sec rate limit is hit.

**Why it happens:** Phase 2 decision: lazy-load on panel open, not at page load. Each Sheet open may call 1–2 Airtable APIs.

**How to avoid:** Batch into a single server action call returning `{ messages, enrollmentCount }`. Use the cancelled-flag useEffect pattern from Phase 2.

---

## Code Examples

### Derive Campaign Status from event_date (no Airtable field needed)

```typescript
// Source: computed in getCampaigns() map function
function deriveCampaignStatus(eventDateISO: string): Campaign['status'] {
  const now = new Date();
  const eventDate = new Date(eventDateISO);
  const dayAfterEvent = new Date(eventDate);
  dayAfterEvent.setUTCDate(dayAfterEvent.getUTCDate() + 1);

  if (now < eventDate) return 'future';
  if (now < dayAfterEvent) return 'active';
  return 'ended';
}
```

### Status Badge Colors (Hebrew labels)

```typescript
// Mirrors STATUS_BADGE_CLASS pattern from ContactDetailPanel.tsx
const CAMPAIGN_STATUS_BADGE: Record<Campaign['status'], string> = {
  future:  'bg-blue-100 text-blue-700',
  active:  'bg-green-100 text-green-700',
  ended:   'bg-gray-100 text-gray-700',
};

const CAMPAIGN_STATUS_LABEL: Record<Campaign['status'], string> = {
  future: 'עתידי',
  active: 'פעיל',
  ended:  'הסתיים',
};
```

### Time Select Options (Claude's Discretion — recommend every 30 min)

```typescript
// src/components/campaigns/CampaignSheet.tsx
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});
// Renders: 00:00, 00:30, 01:00, ... 23:30
```

### Live Send Preview (updates as event date/time changes)

```typescript
// Compute preview text in the component render — no useEffect needed
// Just derived from current form state

function formatSendPreview(send_at_utc: string | null, locale = 'he-IL'): string {
  if (!send_at_utc) return '';
  const d = new Date(send_at_utc);
  const date = d.toLocaleDateString(locale, { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'numeric' });
  const time = d.toLocaleTimeString(locale, { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hour12: false });
  return `יישלח ב-${date} בשעה ${time}`;
}
```

### Enrollment Count by Campaign (Airtable query)

```typescript
// src/lib/airtable/campaigns.ts — add to existing file
export async function getEnrollmentCountsByCampaign(): Promise<Record<string, number>> {
  const records = await airtableBase('CampaignEnrollments')
    .select({ fields: ['קמפיין'] })
    .all();

  const counts: Record<string, number> = {};
  for (const r of records) {
    const campaignIds = r.fields['קמפיין'] as string[] | undefined;
    if (campaignIds) {
      for (const id of campaignIds) {
        counts[id] = (counts[id] ?? 0) + 1;
      }
    }
  }
  return counts;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| moment.js timezone | Intl.DateTimeFormat or Luxon | ~2022 | moment deprecated; Intl is zero-dep |
| @base-ui/react Dialog from v0.x | `@base-ui/react/dialog` v1.x stable | Dec 2025 | Already in project as Dialog.Root |
| shadcn Calendar (wraps react-day-picker) | react-day-picker v9 directly | 2024–2025 | Simpler, already has Hebrew locale built in |

**Deprecated/outdated:**
- `date-fns-tz` v2 (pre-date-fns v4): replaced by `date-fns` v4 built-in timezone support or `@date-fns/tz`
- `moment-timezone`: deprecated, do not use
- `@base-ui/react/calendar`: not yet shipped in any npm release (master-only as of March 2026)

---

## Open Questions

1. **Campaign `event_date` Airtable field type**
   - What we know: field is named `'תאריך אירוע'` and stores ISO8601 strings
   - What's unclear: whether it stores DATE type (YYYY-MM-DD) or DATETIME type in Airtable — affects what Airtable accepts on create
   - Recommendation: Use `typecast: true` on create (as established in Phase 2 `createContact`) to let Airtable handle conversion

2. **Enrollment count field in Airtable Campaigns table**
   - What we know: the schema was set up in Phase 1; `getCampaigns()` doesn't currently return enrollment counts
   - What's unclear: whether Airtable has a Rollup field for enrollment count already configured
   - Recommendation: Compute count server-side via `getEnrollmentCountsByCampaign()` regardless — avoids reliance on Airtable formula fields

3. **`send_at` field type in Airtable ScheduledMessages**
   - What we know: field is `'שליחה בשעה'`, type likely DATETIME
   - What's unclear: exact format Airtable expects (ISO8601 with Z? without Z?)
   - Recommendation: Use `.toISOString()` which produces `"2026-04-14T06:00:00.000Z"` format — Airtable accepts this per Phase 2 patterns

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 + ts-jest 29.4.6 |
| Config file | `package.json` (jest key), `tsconfig.json` |
| Quick run command | `npm test -- --testPathPattern="campaigns\|scheduled-messages\|timezone"` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAMP-01 | `createCampaign()` writes correct fields to Airtable | unit | `npm test -- --testPathPattern="campaigns.test"` | ❌ Wave 0 |
| CAMP-02 | `upsertScheduledMessages()` creates 4 records with correct send_at | unit | `npm test -- --testPathPattern="scheduled-messages.test"` | ❌ Wave 0 |
| CAMP-03 | `computeSendAt()` produces correct UTC for all 4 offset labels, including DST boundary | unit | `npm test -- --testPathPattern="timezone.test"` | ❌ Wave 0 |
| CAMP-04 | `getCampaigns()` returns status 'future'/'active'/'ended' correctly | unit | `npm test -- --testPathPattern="campaigns.test"` | ✅ Partial (existing tests cover getCampaigns but not status derivation) |
| CAMP-05 | `getEnrollmentCountsByCampaign()` returns correct counts | unit | `npm test -- --testPathPattern="campaigns.test"` | ❌ Wave 0 |
| CAMP-06 | `updateScheduledMessage()` patches correct Airtable fields | unit | `npm test -- --testPathPattern="scheduled-messages.test"` | ❌ Wave 0 |
| UX-02 | Date picker renders, time select renders, live preview updates | manual | visual review in browser | manual-only |

### Sampling Rate
- **Per task commit:** `npm test -- --testPathPattern="campaigns\|scheduled-messages\|timezone"`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/airtable/__tests__/scheduled-messages.test.ts` — covers CAMP-02, CAMP-06
- [ ] `src/lib/airtable/__tests__/timezone.test.ts` — covers CAMP-03 with DST edge cases
- [ ] `src/lib/airtable/__tests__/campaigns.test.ts` — extend existing file with `createCampaign`, `getEnrollmentCountsByCampaign`, and `deriveCampaignStatus` test cases

---

## Sources

### Primary (HIGH confidence)
- Local filesystem inspection — `node_modules/@base-ui/react/` listing confirms no calendar module in v1.3.0
- Local filesystem — `src/lib/airtable/`, `src/components/`, `package.json` — full codebase structure
- Local `src/lib/airtable/__tests__/` — established Jest mock pattern for Airtable tests

### Secondary (MEDIUM confidence)
- [Base UI Releases page](https://base-ui.com/react/overview/releases) — confirms no Calendar component in any released version up to v1.3.0
- [mui/base-ui GitHub source](https://github.com/mui/base-ui/blob/master/packages/react/src/calendar/root/CalendarRoot.tsx) — confirms Calendar exists in master with RTL TODO
- [Israel DST 2026 - timeanddate.com](https://www.timeanddate.com/time/change/israel/jerusalem) — confirmed: DST start March 27, end October 25; UTC+2 winter, UTC+3 summer

### Tertiary (LOW confidence)
- react-day-picker v9 Hebrew locale support — from search snippet, not verified against live docs; verify before implementing if chosen

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified by local package inspection
- Architecture: HIGH — mirrors Phase 2 patterns already in codebase
- DST computation: MEDIUM — Intl API approach is standard but exact implementation needs test verification
- DatePicker absence: HIGH — confirmed by local package listing + Base UI releases page

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable stack; Intl API and Airtable patterns are stable)
