# Phase 6: Stats + Polish - Research

**Researched:** 2026-03-19
**Domain:** Client-side data aggregation, date filtering, mobile responsive Tailwind CSS, RTL layout
**Confidence:** HIGH

## Summary

Phase 6 is a pure frontend polish phase with zero new backend work. All data needed for the growth table already exists: `getContacts()` returns every contact with `created_at`, so aggregation runs entirely client-side inside `ContactsPageClient.tsx`. No new Airtable calls, no new server actions, no schema changes.

The mobile responsive work is similarly surgical: the navigation layer (MobileHeader + Sidebar) is already done. The remaining work is fixing content readability — specifically ContactDetailPanel (missing explicit width) and ensuring the contacts and campaigns lists have no horizontal overflow. The layout itself uses `flex min-h-screen` with `dir="rtl"` on `<html>`, which is correct.

CONT-03 is technically already marked Complete in REQUIREMENTS.md (mapped to Phase 2), but Phase 6 extends it with the growth trend table — month-by-month breakdown below the existing stat cards. This is additive, not remedial.

**Primary recommendation:** Two self-contained plans — (1) growth table in ContactsPageClient, (2) mobile responsive audit and targeted fixes. No new dependencies required.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Growth visualization format: TABLE (not chart/bar chart) — no new chart library needed
- Two columns: month + count
- Show only months with at least one join (no zero rows)
- Sort: newest first (descending)
- Position: contacts page, below existing stat cards
- Date range: free From/To `<input type="date">` pickers
- Default range: last 3 months (from = today - 3 months, to = today)
- Date picker pattern: same as CreateCampaignModal `<input type="date">` — consistency
- Mobile scope: campaigns list and contacts list must be readable on mobile
- No horizontal scroll, no clipped text
- Navigation already works (MobileHeader + Sidebar) — do not change

### Claude's Discretion
- Month name format in table (ינואר 2026 vs 01/2026)
- Card/container style for the growth table
- Which specific sub-components are broken on mobile — investigate and fix as found (ContactDetailPanel, AddContactModal, CreateCampaignModal)
- Padding adjustments on pages on mobile

### Deferred Ideas (OUT OF SCOPE)
- Airtable Dashboard charts
- Cumulative total column in growth table
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONT-03 | מיכל יכולה לראות סטטיסטיקות בסיסיות — כמה נרשמו בחודש, סך הכל | Extended by growth table: month-by-month breakdown from existing `contacts` prop via client-side aggregation; date range filter with From/To `<input type="date">` |
</phase_requirements>

---

## Standard Stack

### Core (no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (already installed) | 19.2.3 | useState for from/to date range, useMemo for aggregation | Already in project |
| Tailwind CSS (already installed) | 4 | Responsive utilities `sm:`, `md:`, `w-full`, `max-w-*` | Already in project |
| shadcn Card (already installed) | current | Growth table container — matches existing stat cards | Established pattern |
| `<input type="date">` (native HTML) | — | Date range pickers — no library needed | Established pattern in CreateCampaignModal |
| `Intl.DateTimeFormat` (built-in JS) | — | Month name formatting (ינואר 2026) | Zero-cost, RTL-aware |

### No New Libraries Required
The entire phase is implementable with what is already installed. Explicitly confirmed by CONTEXT.md: "אין צורך ב-chart library חדשה".

**Installation:** None required.

---

## Architecture Patterns

### Growth Table: Client-Side Aggregation

The `contacts` prop in `ContactsPageClient` already contains all contacts with `created_at`. Aggregation pattern:

1. Filter `contacts` by `from` and `to` date state (inclusive)
2. Group by `YYYY-MM` key
3. Sort descending
4. Render as `<table>` inside a Card component

```typescript
// Pattern: useMemo to avoid re-computing on every keypress in search
const growthData = React.useMemo(() => {
  const fromDate = fromStr ? new Date(fromStr) : null;
  const toDate = toStr ? new Date(toStr + 'T23:59:59') : null;

  const counts: Record<string, number> = {};
  for (const c of contacts) {
    const d = new Date(c.created_at);
    if (fromDate && d < fromDate) continue;
    if (toDate && d > toDate) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return Object.entries(counts)
    .sort(([a], [b]) => b.localeCompare(a)) // descending YYYY-MM
    .map(([key, count]) => ({ key, count }));
}, [contacts, fromStr, toStr]);
```

### Default Date Range Initialization

```typescript
// Runs once on mount — stable initial values
function getDefaultFrom(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
function getDefaultTo(): string {
  return new Date().toISOString().slice(0, 10);
}

const [fromStr, setFromStr] = React.useState(getDefaultFrom);
const [toStr, setToStr] = React.useState(getDefaultTo);
```

### Month Display Format

Use `Intl.DateTimeFormat` with `he-IL` locale for Hebrew month names:

```typescript
function formatMonthLabel(yearMonthKey: string): string {
  // key is "YYYY-MM"
  const [year, month] = yearMonthKey.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  // → "ינואר 2026"
}
```

This is Claude's Discretion — Hebrew month names (ינואר 2026) are more readable than 01/2026 for the target user.

### Recommended Structure Change to ContactsPageClient

Insert after the existing stat cards block, before the search input:

```
[stat cards grid] ← existing
[growth table card] ← NEW: date pickers + table
[search input] ← existing
[contacts table] ← existing
```

### Mobile Responsive Patterns

**ContactDetailPanel** — the only Sheet without an explicit width:
```typescript
// Current (missing explicit mobile width):
<SheetContent side="left">

// Fix — add w-full sm:max-w-md to prevent full-width overflow on mobile:
<SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
```

**CampaignSheet** — already correct: `className="w-full sm:max-w-lg overflow-y-auto"` — no change needed.

**ContactsTable** — already has `overflow-x-auto` — no change needed.

**Main layout padding** — `layout.tsx` has `<main className="flex-1 p-6">`. On mobile `p-6` (24px) can be tight with the MobileHeader also consuming vertical space. Reduce to `p-4 md:p-6` if content feels cramped.

**Page-level containers** — `ContactsPageClient` and `CampaignsPageClient` both have `p-6` on their outer div. Since layout.tsx also wraps in `<main className="p-6">`, this is double-padding. For mobile, the page-level padding may need to be `p-0` since the parent already pads, or reduced to `p-4`.

**AddContactModal** — uses `w-full max-w-md` dialog popup with `p-4` outer container — already mobile safe. No changes needed.

**CreateCampaignModal** — not read in this session but follows the same Dialog pattern. Likely already mobile-safe given it was Phase 3 work.

**CampaignCard grid** — `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` — already responsive. No changes needed.

### Anti-Patterns to Avoid

- **New Airtable fetch for growth data:** All data is available in the existing `contacts` prop. Zero new API calls.
- **Filtering in growthData without useMemo:** The contacts list can be large; filtering/grouping on every render will cause jank on search input. Always `useMemo`.
- **Using `new Date(dateStr)` without UTC normalization for date comparisons:** `new Date('2026-01-15')` in JS is parsed as UTC midnight; `new Date(c.created_at)` may also be UTC. Be consistent — compare both as UTC or both as local. Since `created_at` is an ISO string and `<input type="date">` gives `YYYY-MM-DD`, parse the input as `new Date(fromStr + 'T00:00:00Z')` if needed.
- **Fixed pixel widths on table columns:** Use `text-start`, `px-4`, flex layouts. Never hardcode widths that break on small screens.
- **Adding dir="ltr" to month labels in the growth table:** Month labels are Hebrew text — they must remain RTL. Only phone numbers and dates get `dir="ltr"`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Month name display | Custom Hebrew month array | `Intl.DateTimeFormat('he-IL', { month: 'long' })` | Built-in, handles locale edge cases |
| Date range validation | Custom date comparison logic | `new Date(str) >= fromDate` | Standard JS, no edge cases here |
| Chart/graph of growth | Any chart library | Plain `<table>` | Locked decision from CONTEXT.md |

---

## Common Pitfalls

### Pitfall 1: Double Padding Layout
**What goes wrong:** `layout.tsx` has `<main className="flex-1 p-6">` AND `ContactsPageClient` has `<div className="flex flex-col gap-6 p-6">`. On mobile this creates 48px combined padding, consuming width.
**Why it happens:** Page components added their own padding not realizing the layout already pads.
**How to avoid:** Either remove `p-6` from page-level div and let layout padding handle it, or remove from layout and keep in pages. The current pattern (both have p-6) means desktop is fine but mobile is tight.
**Warning signs:** Content looks cramped or very close to edges on mobile viewport < 375px.

### Pitfall 2: Date String Timezone Mismatch
**What goes wrong:** `<input type="date">` returns `"2026-01-01"` (local date string). `new Date("2026-01-01")` is parsed as UTC midnight. If the user is in UTC+2, a contact who joined on Jan 1 in Israel (2025-12-31 22:00 UTC) would be excluded from the Jan 1 filter.
**Why it happens:** Inconsistent UTC vs local parsing.
**How to avoid:** For the date range filter, parse input dates as `YYYY-MM-DDT00:00:00` (local) and compare against `new Date(c.created_at)` converted to local date. Alternatively, group by the contact's created_at in Israel timezone. Since all contacts are Israeli users and precision here is month-level (not day-level), this is LOW risk — but worth noting.
**Warning signs:** Contacts appear in wrong month bucket, especially near month boundaries.

### Pitfall 3: ContactDetailPanel Width on Mobile
**What goes wrong:** `<SheetContent side="left">` without explicit width defaults to shadcn's default which may be 50% or a fixed rem value — could be either too wide (full width with no max) or too narrow.
**Why it happens:** CampaignSheet explicitly sets `w-full sm:max-w-lg`; ContactDetailPanel was built without this consideration.
**How to avoid:** Add `className="w-full sm:max-w-md overflow-y-auto"` to ContactDetailPanel's SheetContent.
**Warning signs:** Detail panel looks broken (too narrow to read or clipping content) on mobile viewport.

### Pitfall 4: Growth Table Empty State
**What goes wrong:** If the date range has no contacts, rendering an empty table header with no rows looks broken.
**How to avoid:** Add an explicit empty state: "אין הצטרפויות בטווח התאריכים שנבחר" when `growthData.length === 0`.

---

## Code Examples

### Growth Table Full Pattern
```typescript
// Source: established project pattern (ContactsPageClient existing stat cards)
// Card + CardHeader + CardContent — same as existing stat cards

<Card>
  <CardHeader>
    <CardTitle className="text-sm font-semibold">צמיחת קהל לפי חודש</CardTitle>
    {/* Date pickers */}
    <div className="flex gap-2 items-center flex-wrap mt-2">
      <label className="text-xs text-muted-foreground">מ-</label>
      <input
        type="date"
        value={fromStr}
        dir="ltr"
        onChange={(e) => setFromStr(e.target.value)}
        className="rounded-md border px-2 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <label className="text-xs text-muted-foreground">עד</label>
      <input
        type="date"
        value={toStr}
        dir="ltr"
        onChange={(e) => setToStr(e.target.value)}
        className="rounded-md border px-2 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  </CardHeader>
  <CardContent>
    {growthData.length === 0 ? (
      <p className="text-sm text-muted-foreground">אין הצטרפויות בטווח התאריכים שנבחר</p>
    ) : (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="pb-2 text-start font-medium">חודש</th>
            <th className="pb-2 text-start font-medium">הצטרפו</th>
          </tr>
        </thead>
        <tbody>
          {growthData.map(({ key, count }) => (
            <tr key={key} className="border-b last:border-0">
              <td className="py-2 pe-4">{formatMonthLabel(key)}</td>
              <td className="py-2 font-medium">{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </CardContent>
</Card>
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Chart library (recharts, Chart.js) | Plain HTML table | Locked decision — lighter, no new dep |
| Fetching growth data from Airtable | Client-side aggregation from existing prop | Zero extra API calls |
| Fixed-width Sheets | `w-full sm:max-w-*` | shadcn/ui responsive pattern |

---

## Open Questions

1. **Double-padding in layout vs page components**
   - What we know: `layout.tsx` has `p-6` on `<main>`, and both ContactsPageClient and CampaignsPageClient have `p-6` on their outer div
   - What's unclear: Whether to fix in layout, page, or both — and whether removing layout padding would break other pages
   - Recommendation: During mobile audit, inspect each page. If double-padding is consistent across all pages, remove from layout and keep in pages. If inconsistent, fix per-page.

2. **`created_at` vs `joined_date` field for growth aggregation**
   - What we know: `Contact` type has both `created_at` (Airtable record creation timestamp, always present) and `joined_date` (optional field). CONTEXT.md specifies using `created_at`.
   - What's unclear: Whether `joined_date` could differ from `created_at` for webhook-added contacts
   - Recommendation: Use `created_at` as specified in CONTEXT.md — it's always populated.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 + ts-jest 29.4.6 |
| Config file | package.json `jest` key |
| Quick run command | `npx jest --testPathPattern="src/lib/airtable/__tests__"` |
| Full suite command | `npx jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONT-03 | Growth aggregation: contacts grouped by month, date range filter applied | unit | `npx jest --testPathPattern="contacts"` | ❌ Wave 0 — new utility function |
| CONT-03 | Mobile layout: no horizontal scroll on contacts/campaigns pages | manual | Visual inspection on mobile viewport | N/A (visual) |

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern="contacts" --passWithNoTests`
- **Per wave merge:** `npx jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/airtable/__tests__/contacts.test.ts` — add tests for growth aggregation helper (if extracted to a pure function)
- [ ] Growth helper should be a pure function (not inlined in component) to enable unit testing — `aggregateByMonth(contacts, from, to): {key, count}[]`

*Note: Mobile responsive fixes are visual — no automated test coverage is practical. Manual review on Chrome DevTools mobile viewport (375px width) is the verification method.*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `ContactsPageClient.tsx`, `ContactDetailPanel.tsx`, `CampaignSheet.tsx`, `ContactsTable.tsx`, `AddContactModal.tsx`, `CampaignsPageClient.tsx`, `layout.tsx`, `MobileHeader.tsx`
- Direct config inspection: `package.json` (jest config, dependencies)
- `06-CONTEXT.md` — locked decisions from user discussion

### Secondary (MEDIUM confidence)
- `Intl.DateTimeFormat` MDN behavior for `he-IL` locale — standard browser/Node API, well-established

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all dependencies already in project
- Architecture: HIGH — patterns verified directly from existing codebase code
- Pitfalls: HIGH — identified from direct code inspection of existing components
- Mobile fixes: MEDIUM — specific rendering behavior requires visual confirmation; identified candidates are well-justified from code review

**Research date:** 2026-03-19
**Valid until:** 2026-06-19 (stable — no external dependencies changing)
