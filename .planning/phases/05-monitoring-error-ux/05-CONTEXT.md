# Phase 5: Monitoring + Error UX - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Michal can track every message's fate per campaign, see who didn't receive a message (name + phone + reason), and understand failures in plain Hebrew with actionable guidance. Also: a disconnect warning banner on the campaigns page when GREEN API is offline. Actual message sending mechanics are Phase 4 (complete).

</domain>

<decisions>
## Implementation Decisions

### Message log location
- New tab inside the Campaign Sheet — label: "יומן שליחות"
- Tab added alongside the existing message slots view (same Sheet, tabbed layout)
- Log scope: all MessageLog entries for the entire campaign (all 4 message slots combined)
- Columns displayed: שם מלא, טלפון (Israeli format 050-123-4567), סטטוס, זמן שליחה, סיבת שגיאה
- Default view shows ALL entries (sent + failed)
- A "רק כשלונות" toggle filters to failures only — this satisfies MON-02 (who didn't receive)
- Phone displayed in Israeli format for readability (same as contacts page)

### Failed recipients view
- Not a separate UI — satisfied by the "רק כשלונות" toggle in the log tab
- No additional modals, badges, or sections needed

### Error message friendliness
- Rule-based mapping function in code: raw GREEN API error → friendly Hebrew string
- Three primary mappings (covers ~90% of real cases):
  1. Phone not on WhatsApp (e.g., 403 / "not registered"): "מספר הטלפון לא קיים בוואצאפ — בדקי את המספר בכרטיסיית אנשי קשר"
  2. GREEN API disconnected (e.g., 401 / "notAuthorized"): "גרין אפיאי מנותקת — הודעות לא נשלחות, נא להתחבר מחדש בהגדרות"
  3. Network timeout / connection error: "בעיית תקשורת זמנית — ההודעה לא נשלחה, נסי שוב מאוחר יותר"
- Unknown errors fall back to: "שגיאה לא ידועה — פני לתמיכה אם הבעיה חוזרת"
- Format: reason + action hint (Michal knows what to do next, not just what went wrong)
- Mapping applied at display time (no scheduler changes needed)

### GREEN API disconnect UX (MON-03)
- Warning banner at the top of the Campaigns page (/kampanim) when disconnected
- Banner text: "גרין אפיאי מנותקת — הודעות לא ישלחו" + link to Settings page (הגדרות)
- Banner only appears when state ≠ 'authorized' — hidden when connected
- Implementation: server component fetches `getGreenApiState()` on every page load
- force-dynamic on campaigns page (same pattern as Settings page from Phase 4)
- Settings page badge (Phase 4) remains unchanged — this is additive

### Claude's Discretion
- Exact tab UI (tabs vs pills vs toggle)
- Loading state for the log tab (skeleton or spinner)
- Empty state when no log entries exist yet
- Banner styling (color, icon, dismissible or persistent)
- Exact timestamp format in the log table

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/campaigns/CampaignSheet.tsx`: Campaign Sheet — extend with a "יומן שליחות" tab; already has slot state, loading state, broadcast state patterns to follow
- `src/components/ui/sheet.tsx`: Sheet component — no changes needed, just content extension
- `src/lib/airtable/message-log.ts`: `createMessageLogEntry()` — write path exists; need to add a read function `getMessageLogByCampaign(campaignId)`
- `src/lib/airtable/green-api.ts`: `getGreenApiState()` — already implemented, just needs to be called from campaigns page server component
- `src/lib/airtable/types.ts`: `MessageLog` type already defined with all needed fields
- `src/lib/airtable/phone.ts`: Phone normalization utilities — use reverse formatter for 050-xxx display
- `src/app/hagdarot/page.tsx`: force-dynamic pattern — copy to campaigns page

### Established Patterns
- Sheet with tabbed content: no existing tabs in Sheet — new pattern, but tabbing is straightforward
- `STATUS_BADGE` map in CampaignSheet: `{ pending, sending, sent, failed }` → Hebrew label + color class — extend or reuse for log tab
- force-dynamic + server component for live GREEN API state (Phase 4 Settings page)
- Israeli phone display format (`dir="ltr"`, 050-xxx-xxxx) — established in Phase 2 contacts table
- Tailwind 4 RTL logical properties throughout

### Integration Points
- `src/app/kampanim/page.tsx`: Add `getGreenApiState()` call + pass result to client component for banner; needs `export const dynamic = 'force-dynamic'`
- `src/components/campaigns/CampaignSheet.tsx`: Add log tab with lazy-load of MessageLog entries on tab open
- `src/lib/airtable/message-log.ts`: Add `getMessageLogByCampaign(campaignId)` read function
- `src/app/kampanim/actions.ts`: May need a new server action `getCampaignLogAction(campaignId)` for the client Sheet to call

</code_context>

<specifics>
## Specific Ideas

- Log tab loads lazily on first tab open (same pattern as contact detail panel in Phase 2 — no Airtable calls until needed)
- "רק כשלונות" toggle is a simple boolean filter on already-loaded data (no second Airtable call)
- Banner links to /hagdarot (Settings) — same as the "connect GREEN API" guidance established in Phase 1

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-monitoring-error-ux*
*Context gathered: 2026-03-19*
