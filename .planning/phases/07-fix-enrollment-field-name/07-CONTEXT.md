# Phase 7: Fix Enrollment Field Name + Test Mocks - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix critical bug: `getContactEnrollments` and `getEnrolledContactIds` query the wrong Airtable field name (`אשת קשר` instead of `איש קשר`), causing empty enrollment history in ContactDetailPanel. Fix all 4 field-name locations, align test mocks, scan all service layer files for similar issues, and enrich ContactDetailPanel to show campaign names + dates instead of raw IDs. Delivers CONT-02.

</domain>

<decisions>
## Implementation Decisions

### Field name fix
- Fix all 4 locations of `אשת קשר` → `איש קשר` in contacts.ts
- Both `getContactEnrollments` (2 locations) and `getEnrolledContactIds` (2 locations) must be updated
- Table name stays Hebrew (`נרשמות`) — that is the actual Airtable table name; do not change it

### Test mock alignment
- Fix test at line 216 that expects `'CampaignEnrollments'` — update to expect `'נרשמות'`
- Any test mocks missing `_rawJson.createdTime` for contact records should be updated
- Tests should use `'איש קשר'` field name (some tests already do — verify all are aligned)

### Audit scope
- Scan all `src/lib/airtable/*.ts` service files for any `אשת קשר` occurrences or other field name inconsistencies
- Fix any issues found in this same phase — do not defer

### Campaign name enrichment in ContactDetailPanel
- Load campaigns lazily inside ContactDetailPanel when the panel opens (alongside enrollments)
- Use existing `getCampaigns()` from `src/lib/airtable/campaigns.ts`
- Display format: campaign name + event date — e.g., `ורטיקל ממולץ — 15/03/2026`
- Replace the raw `קמפיין: recXXXX` heading with the enriched name+date format
- If campaign fetch fails or ID not found: fall back to raw record ID

### Claude's Discretion
- Exact date format for the campaign date display (dd/MM/yyyy or similar Hebrew convention)
- Loading state while campaigns are being fetched inside the panel
- How to merge the campaigns fetch with the existing enrollments+messages fetch (parallel or sequential)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getCampaigns()` from `src/lib/airtable/campaigns.ts`: fetches all campaigns — use this to build an ID→name+date lookup map
- `ContactDetailPanel.tsx`: existing enrollment display loop starting at line 101 — enrich `campaignId` lookup here
- Lazy load pattern already in place (useEffect on `contact?.id`, cancelled fetch flag) — extend to include campaigns fetch

### Established Patterns
- `useEffect` with cancelled-fetch flag for lazy loading (Phase 2 pattern) — apply same pattern for campaigns fetch
- `FIND + ARRAYJOIN` required for linked record filterByFormula (hard rule from Phase 2)
- `dir=ltr` on phone display cells (Phase 2) — similarly, Arabic numerals in dates should be ltr

### Integration Points
- `getContactEnrollments` → called from `ContactDetailPanel` via `/api/contact-detail` or Server Action
- `getEnrolledContactIds` → called from broadcast action in `kampanim/actions.ts` — must work correctly after fix

</code_context>

<specifics>
## Specific Ideas

- Campaign heading format: `{name} — {date}` (em dash separator, consistent with existing UI patterns)
- The enrichment should not require any new Airtable tables or schema changes

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-fix-enrollment-field-name*
*Context gathered: 2026-03-22*
