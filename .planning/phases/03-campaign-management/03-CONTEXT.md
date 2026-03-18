# Phase 3: Campaign Management - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Campaign creation (name, event date/time), visual message scheduling (4 relative offset slots), campaign list with status and enrollment counts, and editing of pending message send times. Actual message sending (Bree scheduler + GREEN API) is Phase 4. This phase writes ScheduledMessage records to Airtable but does not send them.

</domain>

<decisions>
## Implementation Decisions

### Campaign creation flow
- Modal dialog triggered by "צור קמפיין" button on the campaigns list page — consistent with "add contact" pattern from Phase 2
- Modal contains: שם קמפיין, תאריך אירוע (visual date picker), שעת האירוע (visual time picker), תיאור (optional text)
- After saving, modal closes and the new campaign's Sheet panel opens automatically (no separate detail page)

### Campaign list layout
- Card grid — not table rows
- Each card shows: שם קמפיין, תאריך האירוע, סטטוס badge (עתידי / פעיל / הסתיים), כמות נרשמות, כמות הודעות שהוגדרו, תיאור קצר (truncated if long)
- Clicking a card opens a Sheet (slide panel) — same Sheet component pattern as contact detail in Phase 2

### Campaign Sheet (detail panel)
- Sheet is the primary UI for campaign detail — no dedicated /kampanim/[id] page
- Top section: campaign name, event date/time, description, enrollment count
- Lower section: 4 fixed message slots (always visible, not dynamically added)

### Message scheduling UI (inside the Sheet)
- 4 fixed slots always displayed: שבוע לפני, יום לפני, בוקר האירוע, חצי שעה לפני
- Each slot: text area for message content + time configuration
- "שבוע לפני" and "יום לפני" = fixed offset (7 days before / 1 day before), send time defaults to 09:00
- "בוקר האירוע": Michal chooses the time (time picker) — e.g., 08:00
- "חצי שעה לפני": Michal chooses the base time (which is the event time minus 30 min — but she should be shown the calculated time, not asked to subtract manually)
- Below each slot, show the computed send date/time in Israeli time immediately: e.g., "יישלח ב-14/4 בשעה 09:00" — updates live as event date/time changes
- Empty slot (no message content) = skipped, no ScheduledMessage record created
- "שמור הודעות" button saves all filled slots to Airtable

### Editing pending messages
- Message fields inside the Sheet are always editable (both content and time)
- For messages already sent (status = sent): content and time fields still editable — no lock
- Editing a pending message's time → recalculates send_at and updates Airtable immediately on save
- Status label (ממתין / נשלח / נכשל) shown per slot — read-only badge

### Date and time inputs
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/sheet.tsx`: Sheet slide panel — already established for contact detail; reuse for campaign detail
- `src/components/ui/card.tsx`: Card component — use for campaign cards in grid
- `src/components/ui/button.tsx`: Button — for "צור קמפיין", "שמור הודעות" etc.
- `src/lib/airtable/campaigns.ts`: `getCampaigns()` and `getCampaignById()` already exist; need to add `createCampaign()` and `upsertScheduledMessages()`
- `src/lib/airtable/types.ts`: `Campaign`, `ScheduledMessage` types already defined; `offset_label` enum matches the 4 slots
- `src/app/kampanim/page.tsx`: Placeholder page — replace with real campaign list

### Established Patterns
- Server components for Airtable data fetching, Client components for interactivity (Sheet state, form state)
- Modal dialogs for creation forms (established in Phase 2 for "add contact")
- Sheet component for detail panels (established in Phase 2 for contact detail)
- Tailwind 4 RTL logical properties (`ms-*`, `ps-*`) — all spacing must use logical properties
- `dir="rtl"` on `<html>` — layout flows right-to-left automatically
- Hebrew feminine forms throughout (e.g., "נשמרה", "נוצרה")
- Phone display pattern (dir=ltr for numbers) — may apply for date/time display too

### Integration Points
- `src/app/kampanim/page.tsx`: Replace placeholder with campaign list page using `getCampaigns()`
- Airtable service layer: add `createCampaign()`, `getScheduledMessagesByCampaign()`, `upsertScheduledMessages()`, `updateScheduledMessage()` to `campaigns.ts` or a new `scheduled-messages.ts`
- Phase 3 must write ScheduledMessage records that Phase 4 (Bree scheduler) will read and send
- Campaign ID shown as section header in contact detail panel (Phase 2) — Phase 3 will enable enriching those IDs with campaign names by exposing a `getCampaignById()` lookup (already exists)

</code_context>

<specifics>
## Specific Ideas

- Send time preview: "יישלח ב-14/4 בשעה 09:00" shown immediately below each message slot — updates live when event date/time changes
- Cards feel like summary widgets — enough info to know campaign status at a glance without opening the Sheet
- Sheet follows exact same pattern as Phase 2 contact detail: slide from right side on RTL layout

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-campaign-management*
*Context gathered: 2026-03-18*
