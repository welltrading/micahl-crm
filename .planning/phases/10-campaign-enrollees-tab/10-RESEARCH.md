# Phase 10: Campaign Enrollees Tab - Research

**Researched:** 2026-03-22
**Domain:** React Client Component — Airtable data join, Server Actions, Hebrew RTL table UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Add a third tab "נרשמות" to CampaignSheet (alongside "הודעות" and "יומן שליחות")
- Columns: שם מלא (from contact), טלפון (from contact), אימייל (from contact), אישרה וואטסאפ (boolean field from נרשמות table, field name: `אישרה וואטסאפ`)
- Display only — no row click that opens anything
- Remove enrollment button per row (deletes record from נרשמות table)

### Claude's Discretion
- Table design (consistent with existing יומן שליחות table)
- Loading state handling during unenroll
- Confirm dialog before delete
- Hebrew error message if unenroll fails

### Deferred Ideas (OUT OF SCOPE)
- Click on row to open contact detail panel
- Filter/search within enrollees
- CSV export
</user_constraints>

---

## Summary

Phase 10 adds a third tab to the existing `CampaignSheet` component. The tab displays all contacts enrolled in a campaign by joining data from two Airtable tables: נרשמות (enrollment record + `אישרה וואטסאפ` boolean) and מתענינות (contact details: name, phone, email).

The core data challenge is that `getEnrollmentsForCampaign` in `scheduler-services.ts` currently returns only enrollment metadata without the `אישרה וואטסאפ` field, and contact details require a separate fetch per enrollment. A new service function must fetch enrollments including that boolean field, then the action joins contact data via `getContactById`.

The UI pattern to follow is the existing "יומן שליחות" log tab: lazy-load on first tab open, cancelled-fetch guard, loading/error/empty states, and the same `<table>` structure with RTL headers using `pe-3` spacing and `dir="ltr"` on phone cells.

**Primary recommendation:** Add `getEnrolleesForCampaign` to `campaigns.ts` (or extend `scheduler-services.ts`) that fetches נרשמות records including `אישרה וואטסאפ`, add `removeEnrollmentAction` to `actions.ts`, add `deleteEnrollment` to `campaigns.ts`, then wire up the tab in `CampaignSheet.tsx` following the log-tab lazy-load pattern exactly.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (built-in) | Next.js 15 | useState, useEffect for tab state | Already used throughout CampaignSheet |
| Airtable SDK | project-wide | Read/delete נרשמות records | All Airtable access goes through service layer |
| Next.js Server Actions | 15 | `removeEnrollmentAction` in actions.ts | Established mutation pattern in this project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `formatPhoneDisplay` | local | Format phone for display | Used in log tab — use same for consistency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Per-row `getContactById` calls | Batch contact fetch | Per-row is simpler and matches broadcast pattern; acceptable for typical enrollment counts (<200) |

**Installation:**
No new packages required.

---

## Architecture Patterns

### Recommended Project Structure
No new files needed outside existing structure:
```
src/
├── lib/airtable/
│   └── campaigns.ts          # Add getEnrolleesForCampaign + deleteEnrollment
├── app/kampanim/
│   └── actions.ts            # Add getEnrolleesAction + removeEnrollmentAction
└── components/campaigns/
    └── CampaignSheet.tsx     # Add 'enrollees' tab state + render
```

### Pattern 1: Lazy-Load on First Tab Open (matches log tab)
**What:** Load data only when the tab is first activated; guard against stale state from previous campaign.
**When to use:** Any tab in CampaignSheet that requires an Airtable fetch.
**Example (from existing log tab):**
```typescript
// Source: src/components/campaigns/CampaignSheet.tsx lines 186-198
React.useEffect(() => {
  if (activeTab !== 'log' || !campaign) return;
  if (logEntries !== null) return;   // already loaded
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

For enrollees tab: replace `'log'` with `'enrollees'`, and reset `enrolleeEntries` to `null` in the campaign-change useEffect alongside log reset.

### Pattern 2: Tab activeTab State Extension
**What:** The existing `activeTab` state is typed as `'messages' | 'log'`. Extend the union type to include `'enrollees'`.
**When to use:** Adding any new tab.
```typescript
// Change line 104 of CampaignSheet.tsx:
const [activeTab, setActiveTab] = React.useState<'messages' | 'log' | 'enrollees'>('messages');
```
Add a third tab button in the tab navigation bar (lines 328-341), following the exact same className pattern as existing buttons.

### Pattern 3: Service Function — Fetch Enrollees with Contact Join
**What:** New function in `campaigns.ts` fetches נרשמות records for a campaign (with `אישרה וואטסאפ` field) and returns a rich display type joining contact data.
**When to use:** Called from `getEnrolleesAction` in actions.ts.

```typescript
// New type — add to types.ts or define locally in campaigns.ts
export interface EnrolleeDisplayEntry {
  enrollment_id: string;
  full_name: string;
  phone: string;
  email?: string;
  approved_whatsapp: boolean;  // אישרה וואטסאפ
}
```

Service function in `campaigns.ts`:
```typescript
// Fetches enrollment records for a campaign including the אישרה וואטסאפ field
export async function getEnrolleesForCampaign(
  campaignId: string
): Promise<Array<{ enrollment_id: string; contact_id: string; approved_whatsapp: boolean }>> {
  const formula = `FIND("${campaignId}", ARRAYJOIN({קמפיין}))`;
  const records = await airtableBase('נרשמות')
    .select({
      filterByFormula: formula,
      fields: ['איש קשר', 'אישרה וואטסאפ'],
    })
    .all();

  return records.map((r) => ({
    enrollment_id: r.id,
    contact_id: ((r.fields['איש קשר'] as string[]) ?? [])[0] ?? '',
    approved_whatsapp: Boolean(r.fields['אישרה וואטסאפ']),
  }));
}
```

Then the action fetches contacts in parallel:
```typescript
export async function getEnrolleesAction(
  campaignId: string
): Promise<{ enrollees: EnrolleeDisplayEntry[] } | { error: string }> {
  try {
    if (!campaignId) return { error: 'campaignId is required' };
    const raw = await getEnrolleesForCampaign(campaignId);
    const contacts = await Promise.all(raw.map((e) => getContactById(e.contact_id)));
    const enrollees: EnrolleeDisplayEntry[] = raw
      .map((e, i) => {
        const c = contacts[i];
        if (!c) return null;
        return {
          enrollment_id: e.enrollment_id,
          full_name: c.full_name,
          phone: c.phone,
          email: c.email,
          approved_whatsapp: e.approved_whatsapp,
        };
      })
      .filter((e): e is EnrolleeDisplayEntry => e !== null);
    return { enrollees };
  } catch (err) {
    console.error('getEnrolleesAction error:', err);
    return { error: 'שגיאה בטעינת הנרשמות' };
  }
}
```

### Pattern 4: Delete Enrollment (Remove Row)
**What:** Delete a נרשמות record by enrollment record ID.
**Service function in campaigns.ts:**
```typescript
export async function deleteEnrollment(enrollmentId: string): Promise<void> {
  await airtableBase('נרשמות').destroy(enrollmentId);
}
```

**Action in actions.ts:**
```typescript
export async function removeEnrollmentAction(
  enrollmentId: string
): Promise<{ ok: true } | { error: string }> {
  try {
    if (!enrollmentId) return { error: 'enrollmentId is required' };
    await deleteEnrollment(enrollmentId);
    return { ok: true };
  } catch (err) {
    console.error('removeEnrollmentAction error:', err);
    return { error: 'שגיאה בביטול הרישום. נסי שנית.' };
  }
}
```

### Pattern 5: Per-Row Removing State
**What:** Track which row is being removed (by enrollment_id) to show per-row loading state and prevent double-clicks.
```typescript
const [removingId, setRemovingId] = React.useState<string | null>(null);

async function handleRemove(enrollmentId: string) {
  if (!confirm('לבטל את הרישום? פעולה זו אינה הפיכה.')) return;
  setRemovingId(enrollmentId);
  const result = await removeEnrollmentAction(enrollmentId);
  setRemovingId(null);
  if ('error' in result) {
    setEnrolleesError(result.error);
    return;
  }
  // Remove from local state without reload
  setEnrolleeEntries((prev) => prev?.filter((e) => e.enrollment_id !== enrollmentId) ?? null);
}
```

### Pattern 6: Campaign Change Reset
**What:** Add enrollees state reset to the existing `useEffect` that resets on `campaign?.id` change.
The existing reset effect (lines 138-145 of CampaignSheet.tsx) must be extended:
```typescript
React.useEffect(() => {
  setActiveTab('messages');
  setLogEntries(null);
  setLogError(null);
  setLogLoading(false);
  setShowFailuresOnly(false);
  // ADD:
  setEnrolleeEntries(null);
  setEnrolleesError(null);
  setEnrolleesLoading(false);
  setRemovingId(null);
}, [campaign?.id]);
```

### Anti-Patterns to Avoid
- **Fetching all enrollees at sheet open:** Lazy-load only when tab is first activated. Matches the log tab pattern and avoids unnecessary Airtable calls.
- **Calling getContactById sequentially:** Use `Promise.all` for parallel fetches (already established in broadcast action).
- **Reloading all enrollees after remove:** Remove the row from local state optimistically — no full refetch needed.
- **Using getEnrollmentsForCampaign from scheduler-services.ts:** That function is designed for the scheduler worker (no `server-only`, relative imports). For UI actions, use the new function in campaigns.ts which uses the `@/lib/airtable/client` import pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phone display formatting | Custom formatter | `formatPhoneDisplay` from `phone.ts` | Already used in log tab, handles `972XXXXXXXXX` → display format |
| Airtable linked record filter | Plain equality | `FIND("id", ARRAYJOIN({field}))` formula | Plain equality returns empty results (per STATE.md Phase 02 decision) |
| Contact data fetch | Custom API | `getContactById` from `contacts.ts` | Established function, handles null for missing records |

---

## Common Pitfalls

### Pitfall 1: Wrong Field Name for Contact Link in נרשמות Table
**What goes wrong:** Using `אשת קשר` instead of `איש קשר` as the field name in the נרשמות table.
**Why it happens:** Hebrew gendering — the field might seem like it should be feminine.
**How to avoid:** STATE.md Phase 07 fix explicitly documents: `נרשמות table field linking contacts is named 'איש קשר' (not 'אשת קשר')`. Cross-reference: `getContactEnrollments` in `contacts.ts` line 81 confirms `{איש קשר}`.
**Warning signs:** All `contact_id` arrays return empty.

### Pitfall 2: `אישרה וואטסאפ` Field Returns Undefined vs False
**What goes wrong:** Treating `undefined` from Airtable as `false` for the boolean field.
**Why it happens:** Airtable omits unchecked checkbox fields from the record entirely — they are not present in `r.fields`.
**How to avoid:** Always use `Boolean(r.fields['אישרה וואטסאפ'])` — this safely coerces both `undefined` and `false` to `false`.
**Warning signs:** Display shows "true" for all rows, or TypeError on `.fields['אישרה וואטסאפ']`.

### Pitfall 3: Stale Enrollees Data When Campaign Changes
**What goes wrong:** The enrollees tab shows data from the previously opened campaign.
**Why it happens:** `enrolleeEntries` is not reset when `campaign?.id` changes.
**How to avoid:** Include `setEnrolleeEntries(null)` in the existing campaign-change reset useEffect. This is the same pattern used for log entries.

### Pitfall 4: activeTab Type Not Updated
**What goes wrong:** TypeScript error when setting `activeTab` to `'enrollees'`.
**Why it happens:** The type union must be explicitly extended.
**How to avoid:** Change the type literal on line 104 to include `'enrollees'` before adding tab button or useEffect.

### Pitfall 5: enrollmentCount Prop Shows Wrong Count After Remove
**What goes wrong:** The enrollment count in the sheet header still shows the pre-remove number.
**Why it happens:** `enrollmentCount` is a prop passed from parent (from `getEnrollmentCountsByCampaign` at page load), not derived from local state.
**How to avoid:** This is acceptable for v1 — the count updates on next page refresh. Document this as a known limitation. Do not attempt to propagate a count update callback through props (out of scope per deferred items).

---

## Code Examples

Verified patterns from existing codebase:

### Airtable Boolean Field Read
```typescript
// Source: new — based on existing field access patterns in campaigns.ts/contacts.ts
// Checkbox fields are omitted when unchecked; Boolean() coerces undefined to false
approved_whatsapp: Boolean(r.fields['אישרה וואטסאפ']),
```

### Log Tab Table Structure (copy this for enrollees tab)
```typescript
// Source: src/components/campaigns/CampaignSheet.tsx lines 592-636
<div className="overflow-x-auto">
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b text-muted-foreground">
        <th className="pb-2 text-right font-medium pe-3">שם מלא</th>
        <th className="pb-2 text-right font-medium pe-3">טלפון</th>
        <th className="pb-2 text-right font-medium pe-3">אימייל</th>
        <th className="pb-2 text-right font-medium pe-3">אישרה וואטסאפ</th>
        <th className="pb-2 text-right font-medium">ביטול רישום</th>
      </tr>
    </thead>
    <tbody>
      {enrolleeEntries.map((entry) => (
        <tr key={entry.enrollment_id} className="border-b last:border-0">
          <td className="py-2 pe-3">{entry.full_name}</td>
          <td className="py-2 pe-3" dir="ltr">
            {formatPhoneDisplay(entry.phone)}
          </td>
          <td className="py-2 pe-3">{entry.email ?? '—'}</td>
          <td className="py-2 pe-3">{entry.approved_whatsapp ? 'כן' : 'לא'}</td>
          <td className="py-2">
            <button
              onClick={() => handleRemove(entry.enrollment_id)}
              disabled={removingId === entry.enrollment_id}
              className="rounded-md border border-red-200 text-red-600 px-2 py-1 text-xs hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {removingId === entry.enrollment_id ? 'מבטל...' : 'בטל רישום'}
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### Phone Display (dir="ltr" in RTL table)
```typescript
// Source: src/components/campaigns/CampaignSheet.tsx line 607
<td className="py-2 pe-3" dir="ltr">
  {entry.phone ? formatPhoneDisplay(entry.phone) : '—'}
</td>
```

### FIND+ARRAYJOIN Filter Pattern
```typescript
// Source: src/lib/airtable/contacts.ts line 81, scheduler-services.ts line 116
filterByFormula: `FIND("${campaignId}", ARRAYJOIN({קמפיין}))`
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| getEnrollmentsForCampaign returns only enrollment metadata | New getEnrolleesForCampaign must also fetch אישרה וואטסאפ | Phase 10 | Requires new service function |

**Existing function gap:**
- `getEnrollmentsForCampaign` in `scheduler-services.ts`: Does not fetch `אישרה וואטסאפ`. Not suitable to modify (scheduler worker compatibility). New function in `campaigns.ts` needed.
- `CampaignEnrollment` type in `types.ts`: Does not include `approved_whatsapp`. Either add a new display type `EnrolleeDisplayEntry` or extend `CampaignEnrollment`. Recommend a new display type to avoid breaking the scheduler.

---

## Open Questions

1. **`אישרה וואטסאפ` field — confirmed field name?**
   - What we know: CONTEXT.md specifies this exact Hebrew field name. No other source in the codebase references it yet.
   - What's unclear: Whether the Airtable checkbox field is named exactly `אישרה וואטסאפ` (no typos).
   - Recommendation: Treat as confirmed per CONTEXT.md. If data comes back as all `false` at runtime, verify spelling in Airtable UI.

2. **Airtable נרשמות table — is `אישרה וואטסאפ` a checkbox (boolean) or text field?**
   - What we know: CONTEXT.md calls it a "boolean field". Airtable checkbox fields return `true` or `undefined` (never `false` explicitly).
   - Recommendation: Use `Boolean(r.fields['אישרה וואטסאפ'])` — handles both checkbox and text representations safely.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (project-wide) |
| Config file | jest.config.js (project root) |
| Quick run command | `npm test -- --testPathPattern="campaigns"` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| (UI-only phase — no v1 req ID) | `getEnrolleesForCampaign` fetches correct fields | unit | `npm test -- --testPathPattern="campaigns"` | ❌ Wave 0 |
| (UI-only phase — no v1 req ID) | `deleteEnrollment` calls Airtable destroy | unit | `npm test -- --testPathPattern="campaigns"` | ❌ Wave 0 |
| (UI-only phase — no v1 req ID) | `getEnrolleesAction` joins enrollment + contact data | unit | `npm test -- --testPathPattern="kampanim"` | ❌ Wave 0 |
| (UI-only phase — no v1 req ID) | `removeEnrollmentAction` returns ok on success | unit | `npm test -- --testPathPattern="kampanim"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --testPathPattern="campaigns"`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/airtable/__tests__/campaigns.test.ts` — extend with `getEnrolleesForCampaign` and `deleteEnrollment` test cases (file exists, append new describe blocks)
- [ ] `src/app/kampanim/__tests__/enrollees.test.ts` — covers `getEnrolleesAction` and `removeEnrollmentAction` (new file needed)

---

## Sources

### Primary (HIGH confidence)
- Direct code read: `src/components/campaigns/CampaignSheet.tsx` — tab structure, log tab lazy-load pattern, table styling
- Direct code read: `src/lib/airtable/campaigns.ts` — existing service layer patterns
- Direct code read: `src/lib/airtable/scheduler-services.ts` — `getEnrollmentsForCampaign` implementation, CAMPAIGN_FIELD constant
- Direct code read: `src/lib/airtable/contacts.ts` — `getContactById`, FIND+ARRAYJOIN pattern
- Direct code read: `src/app/kampanim/actions.ts` — Server Action patterns, broadcast join pattern
- Direct code read: `src/lib/airtable/types.ts` — CampaignEnrollment type
- Direct code read: `.planning/phases/10-campaign-enrollees-tab/10-CONTEXT.md` — locked decisions
- Direct code read: `.planning/STATE.md` — Phase 07 enrollment field name fix, Phase 02 FIND+ARRAYJOIN decision

### Secondary (MEDIUM confidence)
- None required — all findings verified directly from codebase

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, no new dependencies
- Architecture: HIGH — all patterns derived directly from existing CampaignSheet code
- Pitfalls: HIGH — field name pitfall confirmed by STATE.md Phase 07 history; boolean pitfall is standard Airtable behavior
- Service function design: HIGH — follows established patterns in campaigns.ts and contacts.ts

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable — no fast-moving dependencies)
