# Phase 7: Fix Enrollment Field Name + Test Mocks - Research

**Researched:** 2026-03-22
**Domain:** Airtable service layer field name correction, Jest mock alignment, React client-side enrichment
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Fix all 4 locations of `אשת קשר` → `איש קשר` in contacts.ts
- Both `getContactEnrollments` (2 locations) and `getEnrolledContactIds` (2 locations) must be updated
- Table name stays Hebrew (`נרשמות`) — that is the actual Airtable table name; do not change it
- Fix test at line 216 that expects `'CampaignEnrollments'` — update to expect `'נרשמות'`
- Any test mocks missing `_rawJson.createdTime` for contact records should be updated
- Tests should use `'איש קשר'` field name (some tests already do — verify all are aligned)
- Scan all `src/lib/airtable/*.ts` service files for any `אשת קשר` occurrences or other field name inconsistencies
- Fix any issues found in this same phase — do not defer
- Load campaigns lazily inside ContactDetailPanel when the panel opens (alongside enrollments)
- Use existing `getCampaigns()` from `src/lib/airtable/campaigns.ts`
- Display format: campaign name + event date — e.g., `ורטיקל ממולץ — 15/03/2026`
- Replace the raw `קמפיין: recXXXX` heading with the enriched name+date format
- If campaign fetch fails or ID not found: fall back to raw record ID

### Claude's Discretion
- Exact date format for the campaign date display (dd/MM/yyyy or similar Hebrew convention)
- Loading state while campaigns are being fetched inside the panel
- How to merge the campaigns fetch with the existing enrollments+messages fetch (parallel or sequential)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONT-02 | מיכל יכולה לראות לכל איש קשר אילו הודעות קיבל | Fixed field name enables getContactEnrollments to return real data; campaign name enrichment in ContactDetailPanel makes the history readable |
</phase_requirements>

---

## Summary

Phase 7 is a focused bug-fix + enrichment phase with two distinct concerns. The first is a critical data bug: the `נרשמות` (enrollments) table Airtable field that links to contacts is named `איש קשר`, but `contacts.ts` queries it as `אשת קשר` (a feminine form used during earlier development). This mismatch causes `getContactEnrollments` and `getEnrolledContactIds` to return empty results in production. The fix is straightforward: update 4 string literals in `contacts.ts`.

The second concern is test mock alignment. Existing test at line 216 of `contacts.test.ts` asserts that `getContactEnrollments` calls `airtableBase('CampaignEnrollments')` — the actual call is `airtableBase('נרשמות')`. Additionally, the `getContactById` mock at line 131 is missing `_rawJson: { createdTime: ... }`, which the production code reads via `record._rawJson.createdTime`. Both failures prevent `npm test` from passing cleanly.

The third concern is a UI enrichment: `ContactDetailPanel.tsx` currently shows raw Airtable record IDs as campaign section headings (`קמפיין: recXXXX`). This phase adds a parallel campaigns fetch inside the existing lazy-load `useEffect` to build an ID→`{name, event_date}` lookup map and render human-readable headings.

**Primary recommendation:** Fix the 4 field name literals in contacts.ts first (the data bug), then fix the 2 test mocks, then add the campaigns fetch enrichment to ContactDetailPanel — all in one phase, all straightforward.

---

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Airtable SDK | (existing) | `.select({ filterByFormula })` queries | Already integrated via `src/lib/airtable/client.ts` |
| React `useEffect` | (Next.js 15 built-in) | Lazy loading side-effects in Client Components | Already used in ContactDetailPanel and CampaignSheet |
| Jest | (existing) | Unit tests | Already configured, `npm test` is the test command |

### No New Dependencies
This phase requires zero new npm packages. All tools are already present in the project.

---

## Architecture Patterns

### Pattern 1: FIND + ARRAYJOIN for linked record filtering
**What:** Airtable linked record fields cannot be filtered with plain equality — `filterByFormula: '{field} = "id"'` returns no results. The required pattern is `FIND("id", ARRAYJOIN({field}))`.

**Verified from:** Phase 2 established this pattern; it is already used correctly in `getContactMessages` and `getEnrollmentsForCampaign` in `scheduler-services.ts`. The bug in `getContactEnrollments` is the field NAME inside the formula, not the formula pattern itself.

**Current broken code (line 81 of contacts.ts):**
```typescript
filterByFormula: `FIND("${contactId}", ARRAYJOIN({אשת קשר}))`,
```

**Corrected code:**
```typescript
filterByFormula: `FIND("${contactId}", ARRAYJOIN({איש קשר}))`,
```

### Pattern 2: Parallel fetch with cancelled-flag in useEffect
**What:** ContactDetailPanel already uses this pattern for enrollments+messages. The campaigns fetch must be added to the SAME `useEffect` and run in parallel with `Promise.all`.

**Established pattern (ContactDetailPanel.tsx, lines 46–62):**
```typescript
React.useEffect(() => {
  if (!contact) { setDetail(null); return; }
  let cancelled = false;
  setLoading(true);
  getContactDetail(contact.id).then((data) => {
    if (!cancelled) {
      setDetail(data);
      setLoading(false);
    }
  });
  return () => { cancelled = true; };
}, [contact?.id]);
```

**Extended pattern for campaigns fetch:**
```typescript
React.useEffect(() => {
  if (!contact) { setDetail(null); setCampaignMap({}); return; }
  let cancelled = false;
  setLoading(true);
  Promise.all([
    getContactDetail(contact.id),
    getCampaigns(),
  ]).then(([data, campaigns]) => {
    if (!cancelled) {
      setDetail(data);
      // Build ID → { name, event_date } lookup
      const map: Record<string, { name: string; date: string }> = {};
      for (const c of campaigns) {
        map[c.id] = { name: c.campaign_name, date: c.event_date };
      }
      setCampaignMap(map);
      setLoading(false);
    }
  }).catch(() => {
    if (!cancelled) setLoading(false);
  });
  return () => { cancelled = true; };
}, [contact?.id]);
```

**Note:** `getCampaigns()` is a Server Action (lives in `src/lib/airtable/campaigns.ts` — a service file, not a `'use server'` action). It can be imported directly from a Client Component that calls it via a Server Action wrapper, or the `getContactDetail` Server Action in `actions.ts` can be extended to also return campaigns. Given the CONTEXT.md choice — "load campaigns lazily inside ContactDetailPanel" — the simplest approach is to expose `getCampaigns` through the existing `getContactDetail` Server Action, or create a thin `getCampaignsAction` wrapper. The planner should decide: extending `getContactDetail` to return campaigns avoids adding a second Server Action call from the client.

### Pattern 3: Date formatting in Hebrew RTL context
**What:** The enriched heading format is `{name} — {date}`, e.g. `ורטיקל ממולץ — 15/03/2026`.

**Project precedent:** `formatDate` helper already exists in `ContactDetailPanel.tsx` (line 34–37):
```typescript
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('he-IL');
}
```
`he-IL` locale formats as `dd/MM/YYYY` which matches the example in CONTEXT.md. Reuse this function directly.

**Note:** `event_date` from `getCampaigns()` is an ISO8601 string (UTC). `toLocaleDateString('he-IL')` will use the browser's local timezone, which may display one day off for events scheduled at midnight UTC if the user is in Israel (UTC+2/+3). Since `event_date` represents a date-only value stored as ISO midnight, the day display will typically be correct but could shift. Claude's discretion: add `{ timeZone: 'Asia/Jerusalem' }` to `toLocaleDateString` call to pin display to Israel timezone.

### Anti-Patterns to Avoid
- **Changing `נרשמות` table name string:** CONTEXT.md explicitly locks table name as `נרשמות`. Do not change it.
- **Importing `getCampaigns` directly in a Client Component from the service file:** The service file imports `airtableBase` which uses server-only credentials. Must go through a Server Action wrapper.
- **Adding a separate loading state for campaigns fetch:** Adds complexity. Since campaigns are fetched in the same `Promise.all`, they complete together — use the single `loading` state already present.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Campaign ID lookup | Manual Airtable query per enrollment | `getCampaigns()` → build ID map once | Avoids N+1 Airtable calls per contact |
| Date display | Custom date formatter | `formatDate()` already in ContactDetailPanel | Already locale-aware with `he-IL` |
| Linked record filtering | Custom URL encoding | `FIND + ARRAYJOIN` formula pattern | Required by Airtable API — plain equality silently returns no results |

---

## Common Pitfalls

### Pitfall 1: Changing feminine → masculine in the wrong files
**What goes wrong:** A global search-replace for `אשת קשר` might also catch comment strings or documentation that correctly describe the historical field name, or might miss `getEnrolledContactIds` which uses the same field name.
**Why it happens:** Inattention to all 4 locations.
**How to avoid:** Fix all 4 locations explicitly:
1. `getContactEnrollments` — filterByFormula string (line 81)
2. `getContactEnrollments` — `r.fields['אשת קשר']` read (line 88)
3. `getEnrolledContactIds` — `.select({ fields: ['אשת קשר'] })` (line 126)
4. `getEnrolledContactIds` — `r.fields['אשת קשר']` read (line 131)
**Warning signs:** `npm test` contacts tests still showing `אשת קשר` after fix.

### Pitfall 2: Test mock at line 131 missing `_rawJson`
**What goes wrong:** The `getContactById` test "calls Airtable find with the correct record id" (line 130–138) mocks a record without `_rawJson`. Production code does `record._rawJson.createdTime` — this throws `TypeError: Cannot read properties of undefined (reading 'createdTime')` at runtime.
**Why it happens:** The mock was written to test the `find` call args only, not the full mapping path.
**How to avoid:** Add `_rawJson: { createdTime: '2026-03-15T00:00:00.000Z' }` to the mock object at line 131.
**Warning signs:** Test passes in isolation but throws when `getContactById` result is used.

### Pitfall 3: Test at line 216 expects wrong table name
**What goes wrong:** Test asserts `expect(mockTable).toHaveBeenCalledWith('CampaignEnrollments')` but `getContactEnrollments` calls `airtableBase('נרשמות')`.
**Why it happens:** The test was written before the actual table name was confirmed. The production code already uses the correct Hebrew name — the test is the stale artifact.
**How to avoid:** Update line 216 to `expect(mockTable).toHaveBeenCalledWith('נרשמות')`.
**Warning signs:** This test currently FAILS when you run `npm test`.

### Pitfall 4: `getCampaigns()` called from client without Server Action wrapper
**What goes wrong:** `getCampaigns` imports `airtableBase` from `./client` which uses `process.env.AIRTABLE_API_KEY` and `server-only` guards. Importing it directly in a `'use client'` component would fail at build time.
**Why it happens:** Service files are server-only. Client components must go through `'use server'` actions.
**How to avoid:** Either extend the existing `getContactDetail` Server Action in `actions.ts` to also fetch and return campaigns, or add a thin `getCampaignsAction` wrapper in `actions.ts`.

### Pitfall 5: Campaign map built from `getCampaigns()` may not cover all IDs
**What goes wrong:** An enrollment's `campaign_id[0]` might not be in the campaigns list if the campaign was deleted or if there's a data inconsistency.
**Why it happens:** Airtable linked records can refer to deleted records.
**How to avoid:** The CONTEXT.md locked decision covers this: "If campaign fetch fails or ID not found: fall back to raw record ID." Implement as `campaignMap[campaignId]?.name ?? campaignId`.

---

## Code Examples

### The 4 field name locations to fix in contacts.ts

```typescript
// BEFORE (broken — queries non-existent field):
// getContactEnrollments, line 81:
filterByFormula: `FIND("${contactId}", ARRAYJOIN({אשת קשר}))`,
// getContactEnrollments, line 88:
contact_id: r.fields['אשת קשר'] as string[],
// getEnrolledContactIds, line 126:
.select({ fields: ['אשת קשר'] })
// getEnrolledContactIds, line 131:
const contactIds = r.fields['אשת קשר'] as string[] | undefined;

// AFTER (correct — matches actual Airtable field name):
filterByFormula: `FIND("${contactId}", ARRAYJOIN({איש קשר}))`,
contact_id: r.fields['איש קשר'] as string[],
.select({ fields: ['איש קשר'] })
const contactIds = r.fields['איש קשר'] as string[] | undefined;
```

### Test mock fixes in contacts.test.ts

```typescript
// FIX 1: Line 216 — wrong table name assertion
// BEFORE:
expect(mockTable).toHaveBeenCalledWith('CampaignEnrollments');
// AFTER:
expect(mockTable).toHaveBeenCalledWith('נרשמות');

// FIX 2: Line 131 — missing _rawJson in getContactById mock
// BEFORE:
mockFind.mockResolvedValueOnce({
  id: 'recXYZ',
  fields: { 'שם פרטי': 'test', 'שם משפחה': '', 'שם מלא': 'test', 'טלפון': '972500000000' },
});
// AFTER:
mockFind.mockResolvedValueOnce({
  id: 'recXYZ',
  _rawJson: { createdTime: '2026-03-15T00:00:00.000Z' },
  fields: { 'שם פרטי': 'test', 'שם משפחה': '', 'שם מלא': 'test', 'טלפון': '972500000000' },
});
```

### Campaign name enrichment in ContactDetailPanel.tsx

```typescript
// New state:
const [campaignMap, setCampaignMap] = React.useState<Record<string, { name: string; date: string }>>({});

// In render, replace:
// <p className="...">קמפיין: {campaignId}</p>
// With:
const campaignInfo = campaignMap[campaignId];
const campaignLabel = campaignInfo
  ? `${campaignInfo.name} — ${formatDate(campaignInfo.date)}`
  : campaignId;
// <p className="..."> {campaignLabel} </p>
```

### Extending getContactDetail Server Action to return campaigns

```typescript
// src/app/anshei-kesher/actions.ts
import { getContacts, createContact, getContactEnrollments, getContactMessages } from '@/lib/airtable/contacts';
import { getCampaigns } from '@/lib/airtable/campaigns';

export async function getContactDetail(contactId: string) {
  const [enrollments, messages, campaigns] = await Promise.all([
    getContactEnrollments(contactId),
    getContactMessages(contactId),
    getCampaigns(),
  ]);
  return { enrollments, messages, campaigns };
}
```

---

## Audit Findings — Other Service Files

Full scan of `src/lib/airtable/*.ts` for `אשת קשר`:

- **contacts.ts** — 4 occurrences (all the bug locations, to be fixed)
- **campaigns.ts** — 0 occurrences. Uses `getCampaigns()` correctly querying `קמפיין` table
- **scheduler-services.ts** — 0 occurrences. Uses `CONTACT_FIELD = 'איש קשר'` constant correctly
- **message-log.ts** — 0 occurrences
- **scheduled-messages.ts** — 0 occurrences
- **green-api.ts** — 0 occurrences
- **message-log-client.ts** — 0 occurrences
- **phone.ts** — 0 occurrences

**Conclusion:** The field name bug is isolated to `contacts.ts` only. No other service files require fixes.

Note: `scheduler-services.ts` uses `'CampaignEnrollments'` in a COMMENT (line 110) and in its own test (scheduler-services.test.ts line 174, 179). The scheduler-services test expects `'נרשמות'` — this is NOT broken (the test file says `'נרשמות'` in the actual assertion on line 179). Verify this: `scheduler-services.ts` itself calls `airtableBase('נרשמות')` at line 117. The test at line 179 asserts `'CampaignEnrollments'` — this needs verification during implementation.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (existing) |
| Config file | `jest.config.ts` (project root) |
| Quick run command | `npm test -- --testPathPattern=contacts.test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONT-02 | `getContactEnrollments` returns non-empty results with correct field name | unit | `npm test -- --testPathPattern=contacts.test` | ✅ exists, needs fix |
| CONT-02 | `getEnrolledContactIds` queries `איש קשר` field | unit | `npm test -- --testPathPattern=contacts.test` | ✅ exists (implicit via field scan) |
| CONT-02 | Test table name assertion matches `נרשמות` | unit | `npm test -- --testPathPattern=contacts.test` | ✅ exists, line 216 needs fix |
| CONT-02 | `getContactById` mock has `_rawJson` | unit | `npm test -- --testPathPattern=contacts.test` | ✅ exists, line 131 needs fix |
| CONT-02 | Campaign name displayed in ContactDetailPanel instead of raw ID | manual-only | Open a contact, verify heading reads name + date | N/A — UI |

### Sampling Rate
- **Per task commit:** `npm test -- --testPathPattern=contacts.test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. The test file exists and only needs fixes to existing assertions, not new test files or framework setup.

---

## Open Questions

1. **scheduler-services.test.ts line 179 — does it assert `'CampaignEnrollments'` or `'נרשמות'`?**
   - What we know: The search found `expect(mockTable).toHaveBeenCalledWith('CampaignEnrollments')` at line 179 of scheduler-services.test.ts
   - What's unclear: This test is for `getEnrollmentsForCampaign` in scheduler-services.ts, which correctly queries `'נרשמות'`. So the test assertion on line 179 appears to be wrong — but it wasn't listed in CONTEXT.md as a failing test
   - Recommendation: During implementation, run `npm test -- --testPathPattern=scheduler-services` and check if it fails. If it does, fix it in this phase per the "scan and fix" decision

2. **Server Action extension vs. separate action for campaigns**
   - What we know: `getContactDetail` in `actions.ts` currently returns `{ enrollments, messages }`. Adding `campaigns` here keeps a single round-trip.
   - What's unclear: TypeScript type changes propagate to `ContactDetailPanel` which destructures the return value. Must update the destructure.
   - Recommendation: Extend `getContactDetail` to return `{ enrollments, messages, campaigns }` — simplest path, avoids a second `useEffect` or extra Server Action.

---

## Sources

### Primary (HIGH confidence)
- Direct file read: `src/lib/airtable/contacts.ts` — confirmed all 4 `אשת קשר` locations (lines 81, 88, 126, 131)
- Direct file read: `src/lib/airtable/__tests__/contacts.test.ts` — confirmed line 216 `'CampaignEnrollments'` assertion, confirmed line 131 missing `_rawJson`
- Direct file read: `src/lib/airtable/scheduler-services.ts` — confirmed `CONTACT_FIELD = 'איש קשר'` is correct
- Direct file read: `src/components/contacts/ContactDetailPanel.tsx` — confirmed existing lazy-load pattern and campaign heading location (line 111)
- Direct file read: `src/lib/airtable/campaigns.ts` — confirmed `getCampaigns()` API: returns `Campaign[]` with `id`, `campaign_name`, `event_date`
- Direct file read: `src/app/anshei-kesher/actions.ts` — confirmed `getContactDetail` is the Server Action bridge; extendable

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` decisions: FIND+ARRAYJOIN requirement for linked record fields established in Phase 02
- `.planning/phases/07-fix-enrollment-field-name/07-CONTEXT.md` — all implementation decisions

---

## Metadata

**Confidence breakdown:**
- Bug locations: HIGH — directly read from source files, 4 exact line locations confirmed
- Test mock gaps: HIGH — directly read from test file, 2 exact mock issues confirmed
- Enrichment pattern: HIGH — existing `useEffect` pattern and `getCampaigns()` API confirmed from source
- Other service files: HIGH — grep confirmed no `אשת קשר` outside contacts.ts

**Research date:** 2026-03-22
**Valid until:** 2026-04-21 (stable codebase — no fast-moving dependencies)
