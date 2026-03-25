# Phase 9: Dashboard Live Stats + Dead Code Cleanup - Research

**Researched:** 2026-03-25
**Domain:** Next.js Server Component data aggregation, Airtable service layer, dead code removal
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**כרטיסי סיכום גלובלי (שורה עליונה)**
- 4 כרטיסים: סה"כ נרשמות, מתעניינות פעילות, קמפיינים פעילים/עתידיים, הודעות שנשלחו החודש
- "הודעות שנשלחו החודש" — ספירת סטטוס `sent` בלבד מ-MessageLog, בחודש הקלנדרי הנוכחי (לא כישלונות)
- "מתעניינות פעילות" — סה"כ מכל הקמפיינים (getInterestedCount קיים)
- "קמפיינים פעילים/עתידיים" — status === 'active' || 'future'

**לוח קמפיינים**
- מציג **כל** הקמפיינים (כולל שהסתיימו)
- עיצוב כרטיסים — אותו pattern כמו בדף הקמפיינים (`/kampanim`)
- כל כרטיס מציג: שם, סטטוס + תאריך אירוע, נרשמות + מתעניינות, % המרה (נרשמות ÷ מתעניינות), הודעות שנשלחו

**סטטוס GREEN API**
- מוצג **תמיד** בדאשבורד (לא רק בעת שגיאה)
- אותו עיצוב כמו בדף ההגדרות — נקודה צבעונית + טקסט (ירוק/אדום/אפור)

**מחיקת קוד מת**
- מחיקת `upsertScheduledMessages` מ-`src/lib/airtable/scheduled-messages.ts`
- מחיקת הטסטים של `upsertScheduledMessages` מ-`src/lib/airtable/__tests__/scheduled-messages.test.ts`
- מחיקת `updateMessageTimeAction` מ-`src/app/kampanim/actions.ts` (אין קוראים)

### Claude's Discretion
- עיצוב פנימי של כרטיסי הקמפיינים (spacing, typography, צבע badge סטטוס)
- handling של קמפיין בלי מתעניינות (מחלקה ב-0, הצג "—" במקום %)
- skeleton loading states
- פונקציית service חדשה לספירת הודעות חודשיות (שם, signature)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 9 is a pure polish phase: replace three hardcoded "--" stat cards and a non-functional GREEN API badge in `src/app/page.tsx` with live data, add a campaign grid below the stats, and remove two dead functions that are never called.

All required service functions either already exist or need only one small addition (`getMessagesSentThisMonth`). The dashboard page is already a `force-dynamic` Server Component with `Promise.all` fetching — the pattern for adding more parallel fetches is established. The campaign card visual pattern is encapsulated in `CampaignCard.tsx` and can be reused or closely mirrored.

Dead code removal is straightforward: `upsertScheduledMessages` at line 38 of `scheduled-messages.ts` and its test block (`describe('upsertScheduledMessages', ...)` lines 23–118 of `scheduled-messages.test.ts`), plus `updateMessageTimeAction` at line 129 of `actions.ts`. None have any callers in the codebase.

**Primary recommendation:** Add `getMessagesSentThisMonth()` to `message-log.ts`, then rewrite `src/app/page.tsx` to call all data in one `Promise.all`, render 4 stat cards + GREEN API badge + campaign grid using existing UI components and patterns.

---

## Standard Stack

### Core — Already Installed
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Next.js | 16.1.7 | Server Components, `force-dynamic` | Already in use |
| Airtable SDK | 0.12.2 | Data access via service layer | Service layer at `src/lib/airtable/` |
| shadcn/ui Card | bundled | `Card`, `CardContent`, `CardHeader`, `CardTitle` | Already used in `page.tsx` |
| Tailwind CSS 4 | ^4 | RTL logical properties (`ms-*`, `ps-*`) | CSS-first config via globals.css |

### No New Dependencies
This phase requires zero new npm packages. All work is within existing services and components.

---

## Architecture Patterns

### Established Pattern: force-dynamic Server Component with Promise.all

`src/app/page.tsx` already follows this pattern. All data fetches run in parallel:

```typescript
// Source: current src/app/page.tsx
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [campaigns, contacts, greenApiState, interestedCount, enrollmentCounts, messagesSentThisMonth] = await Promise.all([
    getCampaigns(),
    getContacts(),
    getGreenApiState(),
    getInterestedCount(),
    getEnrollmentCountsByCampaign(),
    getMessagesSentThisMonth(),   // new service function
  ]);
  // ...
}
```

### New Service Function: getMessagesSentThisMonth

Must be added to `src/lib/airtable/message-log.ts`. The table is `יומן הודעות`. The status field `סטטוס` stores Hebrew value `'נשלחה'` for sent messages. The `logged_at` value comes from `_rawJson.createdTime` (Airtable record creation time, ISO8601 UTC).

Strategy: fetch all records for the current calendar month using Airtable `filterByFormula`, filter for `סטטוס = 'נשלחה'`, return count.

```typescript
// Add to src/lib/airtable/message-log.ts
export async function getMessagesSentThisMonth(): Promise<number> {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-based
  const firstOfMonth = new Date(Date.UTC(year, month, 1)).toISOString();
  const firstOfNext = new Date(Date.UTC(year, month + 1, 1)).toISOString();

  // Airtable CREATED_TIME() returns ISO8601 UTC — filter by creation time range
  const records = await airtableBase('יומן הודעות')
    .select({
      filterByFormula: `AND({סטטוס} = 'נשלחה', IS_AFTER(CREATED_TIME(), '${firstOfMonth}'), IS_BEFORE(CREATED_TIME(), '${firstOfNext}'))`,
      fields: ['סטטוס'],
    })
    .all();
  return records.length;
}
```

**Important:** `CREATED_TIME()` is an Airtable formula function that returns the record creation timestamp. It does NOT require a field called "Created time" — it's a built-in formula. This avoids the Airtable sort field name ambiguity noted in STATE.md (Phase 05 decision).

### N+1 Problem: Interested Count per Campaign

`getInterestedCountByCampaign(campaignId)` fetches ALL מתעניינות records every call, then filters in memory. Calling it once per campaign (N campaigns = N+1 Airtable calls) exceeds rate limits at scale.

**Solution:** Add `getInterestedCountsAllCampaigns()` to `campaigns.ts` — one Airtable call, returns `Record<campaignId, number>` (same pattern as `getEnrollmentCountsByCampaign()`):

```typescript
// Add to src/lib/airtable/campaigns.ts
export async function getInterestedCountsAllCampaigns(): Promise<Record<string, number>> {
  try {
    const records = await airtableBase('מתעניינות')
      .select({ fields: ['קמפיין'] })
      .all();
    const counts: Record<string, number> = {};
    for (const r of records) {
      const ids = r.fields['קמפיין'] as string[] | undefined;
      if (ids) {
        for (const id of ids) {
          counts[id] = (counts[id] ?? 0) + 1;
        }
      }
    }
    return counts;
  } catch {
    return {};
  }
}
```

### Sent Messages per Campaign (for campaign cards)

Each campaign card needs "הודעות שנשלחו". `getMessageLogByCampaign(campaignId)` exists but requires N calls. For the dashboard, compute this from the full log:

Option A — add `getMessageLogSentCountsByCampaign()` service function (batch, one Airtable call).
Option B — reuse existing `getMessageLogByCampaign` per campaign (N calls, too expensive).

Use Option A: a single fetch of the entire `יומן הודעות` table filtering `סטטוס = 'נשלחה'`, aggregated by campaign_id into `Record<campaignId, number>`.

```typescript
// Add to src/lib/airtable/message-log.ts
export async function getMessageLogSentCountsByCampaign(): Promise<Record<string, number>> {
  const records = await airtableBase('יומן הודעות')
    .select({
      filterByFormula: `{סטטוס} = 'נשלחה'`,
      fields: ['קמפיין'],
    })
    .all();
  const counts: Record<string, number> = {};
  for (const r of records) {
    const ids = r.fields['קמפיין'] as string[] | undefined;
    if (ids) {
      for (const id of ids) {
        counts[id] = (counts[id] ?? 0) + 1;
      }
    }
  }
  return counts;
}
```

### GREEN API Badge Pattern

Exact pattern from `src/app/hagdarot/page.tsx` (lines 30–54). Reuse verbatim or extract to a shared component if desired (Claude's discretion).

```tsx
// Source: src/app/hagdarot/page.tsx — proven pattern
const isConnected = state === 'authorized';
const isUnknown = state === 'unknown';

<div className="flex items-center gap-2 p-3 rounded-md bg-muted">
  <div className={`w-2.5 h-2.5 rounded-full ${
    isUnknown ? 'bg-gray-400' : isConnected ? 'bg-green-500' : 'bg-red-500'
  }`} />
  <span className="text-sm font-medium">
    {isUnknown ? 'סטטוס לא ידוע' : isConnected ? 'מחובר' : 'מנותק'}
  </span>
  {/* optional descriptive text */}
</div>
```

### Campaign Card in Dashboard

The existing `CampaignCard.tsx` (`src/components/campaigns/CampaignCard.tsx`) shows: name, status badge, event date, enrollment count. For the dashboard, more fields are needed (interested count, conversion %, messages sent). Two options:

Option A — extend `CampaignCard` props (risk: coupling dashboard concerns into shared component).
Option B — create `DashboardCampaignCard.tsx` inline in `src/app/` or as a separate component.

Recommended: inline within `page.tsx` or a small co-located `DashboardCampaignCard.tsx`. Keep `CampaignCard.tsx` unchanged to avoid regressions on `/kampanim` page.

### Conversion Rate Display

`% המרה = Math.round((enrollmentCount / interestedCount) * 100)`

When `interestedCount === 0` or `interestedCount` is missing from the batch result: display `"—"` (not a number or division error).

```typescript
function conversionRate(enrolled: number, interested: number | undefined): string {
  if (!interested) return '—';
  return `${Math.round((enrolled / interested) * 100)}%`;
}
```

### Dead Code Removal

Three surgical deletions with zero callers:

| Target | File | Lines | Callers |
|--------|------|-------|---------|
| `upsertScheduledMessages` function | `src/lib/airtable/scheduled-messages.ts` | 38–102 | None (confirmed by codebase search) |
| `describe('upsertScheduledMessages', ...)` test block | `src/lib/airtable/__tests__/scheduled-messages.test.ts` | 23–118 | — |
| `updateMessageTimeAction` function | `src/app/kampanim/actions.ts` | 129–155 | None (confirmed by codebase search) |

After deletion, `scheduled-messages.test.ts` retains the `describe('updateScheduledMessage', ...)` block (lines 120–149) which remains valid.

`upsertScheduledMessages` import in `scheduled-messages.test.ts` line 19:
```typescript
import { upsertScheduledMessages, updateScheduledMessage } from '../scheduled-messages';
```
Must change to:
```typescript
import { updateScheduledMessage } from '../scheduled-messages';
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Airtable date range filtering | Manual JS date logic after full fetch | Airtable `filterByFormula` with `IS_AFTER`/`IS_BEFORE`/`CREATED_TIME()` | Reduces records fetched; server-side filtering |
| Status badge styling | New CSS | `CAMPAIGN_STATUS_BADGE` + `CAMPAIGN_STATUS_LABEL` constants from `CampaignCard.tsx` | Already established, copy the constants |
| Timezone-aware "this month" | `new Date().toLocaleDateString('he-IL')` | UTC month boundary math (`Date.UTC(year, month, 1)`) | All Airtable times stored as UTC; comparing in UTC is correct and avoids DST edge cases |
| Hebrew status labels | New string map | Copy from `CampaignCard.tsx` `CAMPAIGN_STATUS_LABEL` | DRY — same values needed |

---

## Common Pitfalls

### Pitfall 1: MessageLog sent count — field name ambiguity
**What goes wrong:** Querying `{סטטוס}` with value `'sent'` returns 0 results.
**Why it happens:** The MessageLog table stores Hebrew values: `'נשלחה'` (sent) and `'נכשלה'` (failed). The TypeScript type uses English `'sent'`/`'failed'` but that mapping is done at read time in `getMessageLogByCampaign`. The Airtable field contains Hebrew.
**How to avoid:** Filter formula must use `{סטטוס} = 'נשלחה'` (not `'sent'`).

### Pitfall 2: CREATED_TIME() vs field-based date
**What goes wrong:** Filtering MessageLog by month fails or returns wrong results.
**Why it happens:** There is no dedicated date field in MessageLog — `logged_at` is populated from `r._rawJson.createdTime` at read time in the service layer, not stored in a field. `filterByFormula` can only reference actual Airtable fields or built-in formula functions.
**How to avoid:** Use `CREATED_TIME()` in the filterByFormula — this is a built-in Airtable formula that returns the record creation timestamp, equivalent to `_rawJson.createdTime`.

### Pitfall 3: N+1 Airtable calls for campaign cards
**What goes wrong:** Dashboard makes 1 + N Airtable calls for interested counts (one per campaign). With Airtable free plan at 1,000 calls/month, a dashboard with 10 campaigns burns 11 calls per page load.
**Why it happens:** `getInterestedCountByCampaign` fetches all מתעניינות records and filters in memory — calling it per campaign is pure N+1.
**How to avoid:** Use the batch `getInterestedCountsAllCampaigns()` function (to be added) that returns a map in a single call.

### Pitfall 4: Deleting upsertScheduledMessages breaks the test file import
**What goes wrong:** After deleting `upsertScheduledMessages` from `scheduled-messages.ts`, the test file still imports it by name — `jest` throws a compile error.
**Why it happens:** Named import `{ upsertScheduledMessages, updateScheduledMessage }` on line 19 of the test file.
**How to avoid:** Update the import to `{ updateScheduledMessage }` only when removing the test describe block.

### Pitfall 5: Dashboard stat card grid — currently 3 columns for 3 cards
**What goes wrong:** Adding a 4th stat card without updating the grid class causes layout break on mobile or uneven wrapping.
**Why it happens:** Current `page.tsx` has `grid-cols-1 sm:grid-cols-3`. With 4 cards, this leaves an orphaned card on sm.
**How to avoid:** Change to `grid-cols-2 sm:grid-cols-4` or `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` for the 4-card row.

---

## Code Examples

### Current page.tsx stat cards (lines to be expanded)
```tsx
// Source: src/app/page.tsx (current state — 3 cards, one with "--")
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
  <Card>...</Card>  {/* activeCampaigns — already live */}
  <Card>...</Card>  {/* totalContacts — already live */}
  <Card>
    <CardContent>
      <p className="text-3xl font-bold">--</p>  {/* needs fix */}
    </CardContent>
  </Card>
</div>
```

### Existing service functions available immediately (no changes needed)
```typescript
// All importable from their respective modules:
getCampaigns()                      // campaigns.ts — returns Campaign[]
getContacts()                       // contacts.ts — returns Contact[]
getGreenApiState()                  // green-api.ts — returns 'authorized'|'notAuthorized'|'unknown'
getInterestedCount()                // campaigns.ts — returns number (global total)
getEnrollmentCountsByCampaign()     // campaigns.ts — returns Record<campaignId, number>
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 + ts-jest 29.4.6 |
| Config file | `package.json` → `"jest"` key |
| Quick run command | `npm test -- --testPathPattern="scheduled-messages"` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

This is a polish phase with no formal requirement IDs. Behaviors to validate:

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| `getMessagesSentThisMonth` returns count of sent-only records this month | unit | `npm test -- --testPathPattern="message-log"` | ❌ needs addition |
| `getInterestedCountsAllCampaigns` returns map of counts | unit | `npm test -- --testPathPattern="campaigns"` | ❌ needs addition |
| `getMessageLogSentCountsByCampaign` returns map of sent counts | unit | `npm test -- --testPathPattern="message-log"` | ❌ needs addition |
| `upsertScheduledMessages` tests removed, `updateScheduledMessage` tests pass | unit | `npm test -- --testPathPattern="scheduled-messages"` | ✅ (after edits) |
| `updateMessageTimeAction` not present in actions.ts | manual/lint | TypeScript compile check | ✅ after deletion |

### Sampling Rate
- **Per task commit:** `npm test -- --testPathPattern="scheduled-messages|message-log|campaigns"`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/airtable/__tests__/message-log.test.ts` — add tests for `getMessagesSentThisMonth` and `getMessageLogSentCountsByCampaign`
- [ ] `src/lib/airtable/__tests__/campaigns.test.ts` — add test for `getInterestedCountsAllCampaigns`

Note: the test files themselves already exist (`message-log.test.ts`, `campaigns.test.ts`) — only new `describe`/`it` blocks are needed, not new files.

---

## Sources

### Primary (HIGH confidence)
- Direct file reads: `src/app/page.tsx`, `src/app/hagdarot/page.tsx`, `src/app/kampanim/page.tsx` — current implementations
- Direct file reads: `src/lib/airtable/campaigns.ts`, `message-log.ts`, `green-api.ts`, `scheduled-messages.ts` — service layer
- Direct file reads: `src/app/kampanim/actions.ts` — confirmed `updateMessageTimeAction` has no callers in this file
- Direct file reads: `src/components/campaigns/CampaignCard.tsx` — visual pattern reference
- Direct file reads: `src/lib/airtable/__tests__/scheduled-messages.test.ts` — confirmed test block scope
- `package.json` — confirmed Jest config, test command, no new dependencies needed

### Secondary (MEDIUM confidence)
- Airtable formula docs: `CREATED_TIME()` is a documented built-in formula returning record creation timestamp, usable in `filterByFormula`
- STATE.md Phase 05 decision: `getMessageLogByCampaign sorts client-side by logged_at — avoids Airtable sort field name ambiguity` — confirms `logged_at` = `_rawJson.createdTime`, not a stored field

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all code read directly from the repo
- Architecture: HIGH — all patterns derived from existing implementations in the same codebase
- Pitfalls: HIGH — identified by direct inspection of field values, import statements, and grid classes

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable codebase, no external API changes needed)
