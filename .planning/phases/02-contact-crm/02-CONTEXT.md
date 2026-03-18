# Phase 2: Contact CRM - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Contact list UI with search, manual add, and basic stats. MAKE.com webhook intake for new contacts with phone normalization. Not campaigns (Phase 3), not message sending (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Contact list display
- Table layout (rows + columns) — not card grid or simple list
- Columns: שם מלא, טלפון, תאריך הצטרפות, קמפיין
- Phone displayed in human-readable format (050-123-4567) not raw normalized (972XXXXXXXXXX)
- Search box at top of page — filters by name or phone, client-side filtering

### Contact detail view
- Slide panel (Sheet component, already in codebase) — not full page navigation
- Panel content: contact info (name, phone, join date) + campaign enrollments + message history per CONT-02 requirement
- Message history grouped by campaign (campaign name as section header, messages listed under it)

### Manual add contact
- Modal dialog triggered by a button on the contacts page — not slide panel, not inline form
- Required fields: שם מלא + טלפון only (minimal friction)
- Duplicate phone check: block and show Hebrew error message ("המספר כבר קיים במערכת")

### Stats display
- Summary stat cards at top of contacts page (above the table)
- Stats shown: סך אנשי קשר, הצטרפו החודש, הצטרפו השבוע

### Webhook UX
- MAKE.com webhook adds contacts silently — no real-time notification needed
- New contact appears on next page refresh — acceptable for v1

### Claude's Discretion
- Exact table styling, column widths, hover states
- Loading skeleton / spinner design
- Empty state (no contacts yet) design
- Phone formatting utility implementation (972XXXXXXXXXX → 050-123-4567)
- Webhook authentication (secret token in header or URL param)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/card.tsx`: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter — use for stat cards at top of page
- `src/components/ui/sheet.tsx`: Sheet slide panel — already established pattern for mobile sidebar, reuse for contact detail
- `src/components/ui/button.tsx`: Button component — use for "הוסף איש קשר" trigger
- `src/lib/airtable/contacts.ts`: `getContacts()` and `getContactById()` already implemented
- `src/lib/airtable/types.ts`: `Contact`, `CampaignEnrollment`, `ScheduledMessage` types defined
- `src/app/anshei-kesher/page.tsx`: Placeholder page ready to be replaced

### Established Patterns
- Tailwind 4 with RTL logical properties (`ms-*`, `ps-*`, `border-s`)
- `dir="rtl"` on `<html>` — all flex/layout flows right-to-left automatically
- Server components for data fetching (Airtable calls), client components only where interactivity needed
- Hebrew field names in Airtable API (`שם מלא`, `טלפון`, `נוצר בתאריך`)
- Feminine grammatical forms throughout the UI

### Integration Points
- Contacts route: `src/app/anshei-kesher/page.tsx` — this is where the list goes
- Webhook route: new `src/app/api/webhook/contact/route.ts` (or similar)
- Airtable service: `src/lib/airtable/contacts.ts` needs `createContact()` function added
- Enrollment + message data: `src/lib/airtable/` needs functions for fetching enrollments and scheduled messages by contact

</code_context>

<specifics>
## Specific Ideas

- Phone should be displayed in Israeli format (050-123-4567) in the UI, but stored/sent as 972XXXXXXXXXX internally
- Stats cards should feel like summary widgets, not just numbers — label + number pattern

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-contact-crm*
*Context gathered: 2026-03-18*
