# Phase 5: Monitoring + Error UX — Research

**Researched:** 2026-03-19
**Domain:** Next.js React client state, Airtable read layer, Hebrew error mapping, banner UX
**Confidence:** HIGH — all findings grounded in existing project code; no new external libraries needed

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Message log location:**
- New tab inside the Campaign Sheet — label: "יומן שליחות"
- Tab added alongside the existing message slots view (same Sheet, tabbed layout)
- Log scope: all MessageLog entries for the entire campaign (all 4 message slots combined)
- Columns displayed: שם מלא, טלפון (Israeli format 050-123-4567), סטטוס, זמן שליחה, סיבת שגיאה
- Default view shows ALL entries (sent + failed)
- A "רק כשלונות" toggle filters to failures only — this satisfies MON-02
- Phone displayed in Israeli format for readability (same as contacts page)

**Failed recipients view:**
- Not a separate UI — satisfied by the "רק כשלונות" toggle in the log tab
- No additional modals, badges, or sections needed

**Error message friendliness:**
- Rule-based mapping function in code: raw GREEN API error → friendly Hebrew string
- Three primary mappings (covers ~90% of real cases):
  1. Phone not on WhatsApp (e.g., 403 / "not registered"): "מספר הטלפון לא קיים בוואצאפ — בדקי את המספר בכרטיסיית אנשי קשר"
  2. GREEN API disconnected (e.g., 401 / "notAuthorized"): "גרין אפיאי מנותקת — הודעות לא נשלחות, נא להתחבר מחדש בהגדרות"
  3. Network timeout / connection error: "בעיית תקשורת זמנית — ההודעה לא נשלחה, נסי שוב מאוחר יותר"
- Unknown errors fall back to: "שגיאה לא ידועה — פני לתמיכה אם הבעיה חוזרת"
- Format: reason + action hint
- Mapping applied at display time (no scheduler changes needed)

**GREEN API disconnect UX (MON-03):**
- Warning banner at the top of the Campaigns page (/kampanim) when disconnected
- Banner text: "גרין אפיאי מנותקת — הודעות לא ישלחו" + link to Settings page (הגדרות)
- Banner only appears when state ≠ 'authorized' — hidden when connected
- Implementation: server component fetches `getGreenApiState()` on every page load
- `export const dynamic = 'force-dynamic'` on campaigns page (same pattern as Settings page from Phase 4)
- Settings page badge (Phase 4) remains unchanged — this is additive

### Claude's Discretion
- Exact tab UI (tabs vs pills vs toggle)
- Loading state for the log tab (skeleton or spinner)
- Empty state when no log entries exist yet
- Banner styling (color, icon, dismissible or persistent)
- Exact timestamp format in the log table

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MON-01 | מיכל יכולה לראות לוג שליחות — כל הודעה שנשלחה/נכשלה עם timestamp | `getMessageLogByCampaign()` read function + "יומן שליחות" tab in CampaignSheet |
| MON-02 | מיכל יכולה לראות מי לא קיבלה הודעה (נכשלה) לכל קמפיין | "רק כשלונות" boolean toggle filters already-loaded log data — no second Airtable call |
| MON-03 | סטטוס חיבור GREEN API מוצג בדאשבורד (health check לפני כל batch) | `getGreenApiState()` called from kampanim/page.tsx server component; disconnect banner in CampaignsPageClient |
| UX-04 | שגיאות ובעיות מוסברות בשפה פשוטה עם פעולה מוצעת — לא קודי שגיאה טכניים | `mapErrorToHebrew()` pure function with 3 rule-based mappings + fallback; applied at display time in log table |
</phase_requirements>

---

## Summary

Phase 5 is a pure UI + thin data-layer phase. All infrastructure (MessageLog table, `createMessageLogEntry`, `getGreenApiState`, `formatPhoneDisplay`) already exists. No new npm dependencies are needed. The work is:

1. **One new Airtable read function** — `getMessageLogByCampaign(campaignId)` in `message-log.ts`; reads the existing MessageLog table filtered by campaign linked record.
2. **One new server action** — `getCampaignLogAction(campaignId)` in `kampanim/actions.ts`; thin wrapper so the client Sheet can call it.
3. **One new pure function** — `mapErrorToHebrew(rawError: string): string` in a new utility file or inline in the log tab component; no external deps.
4. **CampaignSheet tab extension** — add a second tab "יומן שליחות" with lazy load, table, and "רק כשלונות" toggle.
5. **Campaigns page banner** — `kampanim/page.tsx` already has `force-dynamic`; add `getGreenApiState()` call and pass result down to `CampaignsPageClient` for conditional banner render.

All patterns are directly established in earlier phases. The highest implementation risk is the Airtable field name for the MessageLog timestamp (field is `logged_at` in the TypeScript type but the Hebrew Airtable field name is undocumented in `message-log.ts` — must verify against actual schema or the setup script).

**Primary recommendation:** Build in 3 work units — (1) data layer: read function + server action, (2) error mapping utility + tests, (3) UI: tab + banner. Keep units independently testable.

---

## Standard Stack

### Core (all already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.1.7 | Server components + server actions | Already installed |
| React | 19.x | Client components (CampaignSheet is `'use client'`) | Already installed |
| Airtable SDK | current | Read from MessageLog table | Already used throughout |
| Tailwind 4 | 4.x | RTL-aware styling (logical properties) | Already used throughout |

### Supporting (already in project)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `formatPhoneDisplay` | internal | 972XXXXXXXXXX → 050-123-4567 display | Log table phone column |
| `getGreenApiState()` | internal | Fetch GREEN API connection state | Banner condition check |
| `STATUS_BADGE` map | CampaignSheet | Hebrew label + color for sent/failed/pending | Reuse in log tab for status column |

### No New Dependencies

This phase adds zero npm packages. All functionality is implemented with existing project libraries.

---

## Architecture Patterns

### Recommended Project Structure

No new directories. New files added to existing structure:

```
src/
├── lib/airtable/
│   ├── message-log.ts          # ADD: getMessageLogByCampaign()
│   └── __tests__/
│       └── message-log.test.ts # NEW: unit tests for read function + mapErrorToHebrew
├── app/kampanim/
│   ├── page.tsx                # MODIFY: add getGreenApiState() + pass greenApiState prop
│   └── actions.ts              # ADD: getCampaignLogAction()
└── components/campaigns/
    ├── CampaignSheet.tsx        # MODIFY: add "יומן שליחות" tab
    └── CampaignsPageClient.tsx  # MODIFY: accept greenApiState prop + render banner
```

### Pattern 1: Lazy-Load on Tab Open (established in Phase 2)

**What:** Data is fetched only when the user first opens the log tab — not on Sheet mount.
**When to use:** Any panel/tab that makes Airtable calls but isn't always visible.
**Example (from ContactDetailPanel — same pattern):**
```typescript
// Trigger fetch only when tab becomes active
React.useEffect(() => {
  if (activeTab !== 'log' || !campaign) return;
  if (logEntries !== null) return; // already loaded

  let cancelled = false;
  setLogLoading(true);

  getCampaignLogAction(campaign.id).then((result) => {
    if (cancelled) return;
    setLogLoading(false);
    if ('error' in result) { setLogError(result.error); return; }
    setLogEntries(result.entries);
  });

  return () => { cancelled = true; };
}, [activeTab, campaign?.id]);
```

**Critical detail:** Include the cancelled flag (same as Phase 2) to prevent stale state on rapid campaign switching.

### Pattern 2: Server Component Banner (established in Phase 4 hagdarot)

**What:** `page.tsx` fetches live GREEN API state at request time; passes result to client component.
**When to use:** Any page that needs live connection status without client-side polling.
**Example (kampanim/page.tsx after change):**
```typescript
import { getCampaigns, getEnrollmentCountsByCampaign } from '@/lib/airtable/campaigns';
import { getGreenApiState } from '@/lib/airtable/green-api';
import { CampaignsPageClient } from '@/components/campaigns/CampaignsPageClient';

export const dynamic = 'force-dynamic'; // already present

export default async function KampaninPage() {
  const [campaigns, enrollmentCounts, greenApiState] = await Promise.all([
    getCampaigns(),
    getEnrollmentCountsByCampaign(),
    getGreenApiState(),
  ]);

  return (
    <CampaignsPageClient
      campaigns={campaigns}
      enrollmentCounts={enrollmentCounts}
      greenApiState={greenApiState}
    />
  );
}
```

**Note:** `force-dynamic` is already on this page (added in Phase 4). No additional change needed for that.

### Pattern 3: Rule-Based Error Mapping

**What:** Pure function mapping raw error strings → friendly Hebrew. Applied at display time only.
**Key principle:** Match by substring/keyword in error string — GREEN API errors are not perfectly consistent.

```typescript
// src/lib/airtable/message-log.ts (or inline in component)
export function mapErrorToHebrew(rawError: string | undefined): string {
  if (!rawError) return '';
  const lower = rawError.toLowerCase();

  // 401 / notAuthorized / unauthorized
  if (lower.includes('401') || lower.includes('notauthorized') || lower.includes('unauthorized')) {
    return 'גרין אפיאי מנותקת — הודעות לא נשלחות, נא להתחבר מחדש בהגדרות';
  }
  // 403 / not registered / not on WhatsApp
  if (lower.includes('403') || lower.includes('not registered') || lower.includes('notregistered')) {
    return 'מספר הטלפון לא קיים בוואצאפ — בדקי את המספר בכרטיסיית אנשי קשר';
  }
  // Network errors
  if (lower.includes('timeout') || lower.includes('econnrefused') || lower.includes('network') || lower.includes('fetch')) {
    return 'בעיית תקשורת זמנית — ההודעה לא נשלחה, נסי שוב מאוחר יותר';
  }

  return 'שגיאה לא ידועה — פני לתמיכה אם הבעיה חוזרת';
}
```

### Pattern 4: Airtable Read with Campaign Filter

**What:** Filter MessageLog by campaign linked record using FIND+ARRAYJOIN (established Phase 2 pattern).
**Critical:** Plain field equality on linked record fields returns empty — must use FIND+ARRAYJOIN.

```typescript
// src/lib/airtable/message-log.ts
export async function getMessageLogByCampaign(campaignId: string): Promise<MessageLogDisplay[]> {
  const records = await airtableBase('MessageLog')
    .select({
      filterByFormula: `FIND("${campaignId}", ARRAYJOIN({קמפיין}))`,
      sort: [{ field: 'זמן רישום', direction: 'desc' }], // verify Hebrew field name
    })
    .all();

  return records.map((r) => ({
    id: r.id,
    contact_id: (r.fields['איש קשר'] as string[])?.[0] ?? '',
    full_name: r.fields['שם מלא'] as string | undefined,  // may need join or separate lookup
    phone: r.fields['טלפון'] as string | undefined,
    status: r.fields['סטטוס'] as 'נשלחה' | 'נכשלה',
    logged_at: r.fields['זמן רישום'] as string,           // verify field name
    error_message: r.fields['הודעת שגיאה'] as string | undefined,
  }));
}
```

**CRITICAL RISK:** The Hebrew field name for the timestamp (`logged_at` in TypeScript type) is NOT documented in `message-log.ts` — only the write fields are listed there. The Airtable record `created_at` is automatically set by Airtable as `createdTime` on `r` (not in `r.fields`). Planner must account for this: `logged_at` likely comes from `r._rawJson.createdTime` (Airtable auto-field), not a custom field.

### Pattern 5: Tab Switch Inside Sheet

**What:** Simple `activeTab` state variable toggleing between `'messages'` and `'log'`.
**No new tab component needed** — can be implemented with two styled `<button>` elements (pills/tabs) toggling content sections. Tailwind border-b and selected state is sufficient.

```typescript
const [activeTab, setActiveTab] = React.useState<'messages' | 'log'>('messages');
```

### Anti-Patterns to Avoid

- **Fetching log entries on every campaign change:** Only fetch when the log tab is first opened — same lazy pattern as Phase 2.
- **Second Airtable call for "רק כשלונות" filter:** The toggle is a `.filter()` on already-loaded in-memory data.
- **Calling getGreenApiState() from client side:** Banner state comes from the server component at page load. No client polling.
- **Mapping errors in the scheduler/worker:** Mapping is display-time only. Scheduler continues storing raw error strings in Airtable (no scheduler changes needed).
- **Wrapping contact name/phone in MessageLog records:** MessageLog has `איש קשר` as a linked record ID — to show שם מלא and טלפון, check whether Airtable returns them via a lookup/rollup field already configured in the schema, or if a separate `getContactById` call per row is needed. Separate calls would be expensive (N contacts × rate limit). See architecture note below.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phone formatting in log table | Custom formatter | `formatPhoneDisplay()` from `phone.ts` | Already handles all Israeli formats |
| Connection status fetch | New API endpoint | `getGreenApiState()` from `green-api.ts` | Already returns 'authorized'/'notAuthorized'/'unknown' |
| Hebrew status labels | New label map | `STATUS_BADGE` map in CampaignSheet | Already maps sent/failed/pending → Hebrew + color class |
| RTL layout in table | Custom CSS | Tailwind 4 `dir="rtl"` + logical properties | Same as all other tables in the project |

---

## Common Pitfalls

### Pitfall 1: `logged_at` field is Airtable `createdTime`, not a custom field

**What goes wrong:** `getMessageLogByCampaign` tries to read `r.fields['זמן רישום']` (or any Hebrew name) and gets `undefined` for every record.
**Why it happens:** The `MessageLog` type has `logged_at: string` but `createMessageLogEntry` never explicitly writes this field — Airtable auto-creates `createdTime`. The sort field name is also unknown.
**How to avoid:** Use `r._rawJson.createdTime` for the timestamp value. For sorting, Airtable supports `sort: [{ field: 'Created', direction: 'desc' }]` using the built-in created time field name.
**Warning signs:** All `logged_at` values are undefined or empty in test runs.

### Pitfall 2: Contact name and phone not directly in MessageLog records

**What goes wrong:** `r.fields['שם מלא']` and `r.fields['טלפון']` are undefined — MessageLog stores a linked record ID for `איש קשר`, not the contact's fields inline.
**Why it happens:** Airtable linked records only store IDs. To display name/phone, either (a) configure lookup/rollup fields in the Airtable MessageLog table to pull in contact fields, or (b) make N separate `getContactById` calls.
**How to avoid:** The safe approach is to include the contact's name and phone at write time (in `createMessageLogEntry`), adding them as plain text fields. However, this requires a schema addition. The cheaper approach for display only: Airtable lookup fields (configured in the UI) that pull `שם מלא` and `טלפון` from the Contacts table — then they appear in `r.fields` during reads.
**Recommendation:** Add lookup/rollup fields to MessageLog table in Airtable UI (Wave 0 setup task), then read them as plain fields. This avoids N+1 contact lookups.
**Warning signs:** Log table shows contact IDs instead of names.

### Pitfall 3: FIND+ARRAYJOIN required for linked record filter

**What goes wrong:** `filterByFormula: "{קמפיין} = '${campaignId}'"` returns zero records.
**Why it happens:** Established in Phase 2 — linked record fields require FIND+ARRAYJOIN pattern.
**How to avoid:** Use `FIND("${campaignId}", ARRAYJOIN({קמפיין}))` (copied from contacts.ts pattern).
**Warning signs:** Empty log even when MessageLog records definitely exist for the campaign.

### Pitfall 4: Banner renders on 'unknown' state (missing env vars)

**What goes wrong:** Banner shows "מנותקת" even when GREEN API env vars aren't set yet (development environment), creating confusion.
**Why it happens:** `getGreenApiState()` returns `'unknown'` when env vars are missing. Banner checks `state !== 'authorized'` which catches unknown too.
**How to avoid:** Only show the banner when `state === 'notAuthorized'`. Do NOT show it for `'unknown'` (that state already handled in Settings page with appropriate guidance).
**Warning signs:** Developer sees banner on every page load in local dev.

### Pitfall 5: CampaignSheet tab state reset on campaign change

**What goes wrong:** User opens log tab for campaign A, closes Sheet, opens campaign B — log tab shows campaign A's data briefly before reload.
**Why it happens:** `logEntries` state isn't reset when campaign changes if the useEffect dependency is only `activeTab`.
**How to avoid:** Include `campaign?.id` in the lazy-load useEffect dependencies. Also reset `logEntries` to `null` when campaign changes (separate useEffect on `campaign?.id`).

---

## Code Examples

### getMessageLogByCampaign — verified patterns from existing codebase

```typescript
// src/lib/airtable/message-log.ts — new read function
// Source: contacts.ts getContactEnrollments() pattern + Phase 2 FIND+ARRAYJOIN decision

export interface MessageLogDisplayEntry {
  id: string;
  contact_id: string;
  full_name?: string;      // from Airtable lookup field on MessageLog
  phone?: string;          // from Airtable lookup field on MessageLog
  status: 'sent' | 'failed';
  logged_at: string;       // from r._rawJson.createdTime
  error_message?: string;
}

export async function getMessageLogByCampaign(
  campaignId: string
): Promise<MessageLogDisplayEntry[]> {
  const records = await airtableBase('MessageLog')
    .select({
      filterByFormula: `FIND("${campaignId}", ARRAYJOIN({קמפיין}))`,
      sort: [{ field: 'Created', direction: 'desc' }],
    })
    .all();

  return records.map((r) => {
    const rawStatus = r.fields['סטטוס'] as string;
    return {
      id: r.id,
      contact_id: (r.fields['איש קשר'] as string[])?.[0] ?? '',
      full_name: r.fields['שם מלא'] as string | undefined,   // lookup field
      phone: r.fields['טלפון'] as string | undefined,         // lookup field
      status: rawStatus === 'נשלחה' ? 'sent' : 'failed',
      logged_at: (r as any)._rawJson?.createdTime ?? '',
      error_message: r.fields['הודעת שגיאה'] as string | undefined,
    };
  });
}
```

### getCampaignLogAction — thin server action wrapper

```typescript
// src/app/kampanim/actions.ts — new export
import { getMessageLogByCampaign, type MessageLogDisplayEntry } from '@/lib/airtable/message-log';

export async function getCampaignLogAction(
  campaignId: string
): Promise<{ entries: MessageLogDisplayEntry[] } | { error: string }> {
  try {
    if (!campaignId) return { error: 'campaignId is required' };
    const entries = await getMessageLogByCampaign(campaignId);
    return { entries };
  } catch (err) {
    console.error('getCampaignLogAction error:', err);
    return { error: 'שגיאה בטעינת יומן השליחות' };
  }
}
```

### Banner in CampaignsPageClient

```typescript
// CampaignsPageClient.tsx — new greenApiState prop + banner render
// Only show for 'notAuthorized' — NOT for 'unknown'
{greenApiState === 'notAuthorized' && (
  <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center justify-between gap-4">
    <span>גרין אפיאי מנותקת — הודעות לא ישלחו</span>
    <a href="/hagdarot" className="font-medium underline underline-offset-2 whitespace-nowrap">
      הגדרות
    </a>
  </div>
)}
```

### Phone display in log table (existing utility)

```typescript
// src/lib/airtable/phone.ts — formatPhoneDisplay already exists
import { formatPhoneDisplay } from '@/lib/airtable/phone';

// In log table row:
<td dir="ltr">{entry.phone ? formatPhoneDisplay(entry.phone) : '—'}</td>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side API calls for page data | Server components with `force-dynamic` | Phase 4 | No waterfall; data fresh on every page load |
| Separate page for connection status | Banner inline on the affected page | Phase 5 decision | Michal sees warning exactly where she needs to act |

---

## Open Questions

1. **Contact name/phone in MessageLog — lookup fields vs plain text vs N+1 reads**
   - What we know: `createMessageLogEntry` currently stores only `איש קשר` (linked ID). Airtable lookup fields could expose `שם מלא` and `טלפון` in reads without code changes.
   - What's unclear: Whether lookup fields already exist on the MessageLog Airtable table (setup script doesn't show them; setup-airtable.mjs only covered ScheduledMessages). No documentation of the full MessageLog schema.
   - Recommendation: Wave 0 task — verify MessageLog table fields in Airtable UI. If lookup fields are absent, add them manually. This is cheaper than N+1 reads or restructuring createMessageLogEntry.

2. **Exact Hebrew field name for `logged_at` sort in Airtable**
   - What we know: `createMessageLogEntry` never writes a timestamp field. Airtable auto-creates `createdTime` accessible via `r._rawJson.createdTime`.
   - What's unclear: Whether `sort: [{ field: 'Created', direction: 'desc' }]` is the correct Airtable field name for the auto-created time field.
   - Recommendation: Planner should add a Wave 0 verify step — test the sort field name. Fallback: sort client-side on `logged_at` after fetch.

3. **Airtable `_rawJson` field stability**
   - What we know: `_rawJson.createdTime` is commonly used in the Airtable.js SDK for the created-at timestamp.
   - What's unclear: SDK version may expose this differently. Could also use `r.fields['Created']` if the Airtable table has a "Created time" field type added.
   - Recommendation: Add a plain "Created time" field type (`זמן יצירה`) to the MessageLog table in Airtable UI — then it reads cleanly from `r.fields['זמן יצירה']` without `_rawJson` hacks. This is the most reliable approach.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30 + ts-jest |
| Config file | `package.json` (jest key) — preset: ts-jest, testEnvironment: node |
| Quick run command | `npx jest src/lib/airtable/__tests__/message-log.test.ts --no-coverage` |
| Full suite command | `npx jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MON-01 | `getMessageLogByCampaign` returns MessageLog entries sorted desc | unit | `npx jest src/lib/airtable/__tests__/message-log.test.ts --no-coverage` | Wave 0 |
| MON-01 | `getCampaignLogAction` wraps read function and returns `{ entries }` | unit | `npx jest src/lib/airtable/__tests__/message-log.test.ts --no-coverage` | Wave 0 |
| MON-02 | "רק כשלונות" toggle filters to status=failed only | manual (UI) | n/a — React state filter, no logic to unit test | n/a |
| MON-03 | Banner renders when `greenApiState === 'notAuthorized'` | manual (UI) | n/a — React render, no logic to unit test | n/a |
| UX-04 | `mapErrorToHebrew` maps known GREEN API error strings | unit | `npx jest src/lib/airtable/__tests__/message-log.test.ts --no-coverage` | Wave 0 |
| UX-04 | `mapErrorToHebrew` fallback for unknown errors | unit | same | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx jest src/lib/airtable/__tests__/message-log.test.ts --no-coverage`
- **Per wave merge:** `npx jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/airtable/__tests__/message-log.test.ts` — covers MON-01 read function and UX-04 mapErrorToHebrew
- [ ] Airtable UI: add "Created time" field to MessageLog table (field name suggestion: `זמן יצירה`)
- [ ] Airtable UI: add lookup fields to MessageLog table for contact `שם מלא` and `טלפון` — or confirm they already exist

---

## Sources

### Primary (HIGH confidence)
- `src/lib/airtable/message-log.ts` — existing write function, field names, type interface
- `src/lib/airtable/types.ts` — `MessageLog` type definition
- `src/lib/airtable/green-api.ts` — `getGreenApiState()` return values
- `src/lib/airtable/phone.ts` — `formatPhoneDisplay()` signature
- `src/lib/airtable/contacts.ts` — FIND+ARRAYJOIN pattern for linked record filter
- `src/components/campaigns/CampaignSheet.tsx` — existing tab/state patterns, `STATUS_BADGE` map
- `src/components/campaigns/CampaignsPageClient.tsx` — existing props interface
- `src/app/kampanim/page.tsx` — force-dynamic already present
- `src/app/kampanim/actions.ts` — server action patterns
- `src/app/hagdarot/page.tsx` — force-dynamic + server component + GREEN API state pattern
- `.planning/phases/05-monitoring-error-ux/05-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` decisions section — FIND+ARRAYJOIN requirement confirmed for Phase 2

### Tertiary (LOW confidence)
- Airtable.js SDK `_rawJson.createdTime` — common community pattern, not verified against current SDK docs. Recommend using a "Created time" field type in Airtable UI instead.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing project libraries, no new deps
- Architecture: HIGH — all patterns established in prior phases; directly reused
- Pitfalls: HIGH — FIND+ARRAYJOIN is confirmed project knowledge; logged_at/contact field risks confirmed by reading actual source code
- Validation: HIGH — Jest 30 + ts-jest already configured

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable domain — no fast-moving external dependencies)
