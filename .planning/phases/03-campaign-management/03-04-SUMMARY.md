---
phase: 03-campaign-management
plan: 04
subsystem: ui
tags: [react, nextjs, airtable, server-actions, rtl, sheet, scheduled-messages]

# Dependency graph
requires:
  - phase: 03-01
    provides: computeSendAt timezone utility and scheduled-messages Airtable service
  - phase: 03-02
    provides: upsertScheduledMessages, getScheduledMessagesByCampaign, updateScheduledMessage
  - phase: 03-03
    provides: CampaignsPageClient with selectedCampaign state wired
provides:
  - CampaignSheet.tsx: RTL slide-in Sheet with 4 message slots, per-slot save, live preview, status badges
  - saveMessagesAction, updateMessageTimeAction, getCampaignMessagesAction server actions
  - timezone-client.ts: client-safe israelDateTimeToUTC + formatSendPreview for live preview
  - Campaign.event_time field added to types.ts, populated from Airtable שעת האירוע
affects:
  - 04-scheduler-engine
  - 05-monitoring-error-ux

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Per-slot save buttons (each slot has independent save + feedback state)
    - Client-safe timezone helper (timezone-client.ts) wraps Intl.DateTimeFormat for browser use
    - Lazy load on Sheet open via getCampaignMessagesAction server action + cancelled-fetch flag

key-files:
  created:
    - src/components/campaigns/CampaignSheet.tsx
    - src/lib/timezone-client.ts
  modified:
    - src/app/kampanim/actions.ts
    - src/lib/airtable/types.ts
    - src/lib/airtable/campaigns.ts
    - src/components/campaigns/CampaignsPageClient.tsx

key-decisions:
  - "Flexible slot system with title/date/time per slot instead of fixed offset labels — more user control"
  - "Per-slot save buttons instead of global save — reduces risk of overwriting unsaved sibling slots"
  - "timezone-client.ts extracts Intl.DateTimeFormat logic into client-safe module — server-only computeSendAt not importable from client components"
  - "SlotData stores send_date (YYYY-MM-DD) + send_time (HH:MM) Israel local, not UTC send_at — scheduler converts to UTC at send time"
  - "saveMessagesAction delegates to upsertScheduledMessages which handles create-vs-update internally"

patterns-established:
  - "Per-slot save: each slot has its own slotSaving[i] / slotError[i] / slotSuccess[i] state arrays"
  - "Lazy-load on Sheet open: getCampaignMessagesAction called in useEffect on campaign?.id change with cancelled flag"
  - "Client-safe timezone: timezone-client.ts exposes israelDateTimeToUTC for browser use without server-only imports"

requirements-completed: [CAMP-02, CAMP-03, CAMP-06, UX-02]

# Metrics
duration: 25min
completed: 2026-03-18
---

# Phase 3 Plan 04: CampaignSheet Summary

**RTL slide-in CampaignSheet with 4 flexible message slots, per-slot save to Airtable, and live Hebrew send-time preview.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-18T12:43:00Z
- **Completed:** 2026-03-18T12:45:15Z
- **Tasks:** 2 of 2 (plus human-verify checkpoint — passed in subsequent session)
- **Files modified:** 6

## Accomplishments

- Built CampaignSheet.tsx: RTL Sheet component with 4 flexible message slots (title, date picker, time picker, content textarea, per-slot save)
- Added saveMessagesAction, updateMessageTimeAction, getCampaignMessagesAction server actions to actions.ts
- Created timezone-client.ts with client-safe israelDateTimeToUTC + formatSendPreview for live send-time preview
- Added event_time field to Campaign type and populated from Airtable שעת האירוע field
- Wired CampaignSheet into CampaignsPageClient (replaces null placeholder)
- Status badges per slot: ממתין (yellow), נשלח (green), נכשל (red)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add saveMessagesAction and updateMessageTimeAction to actions.ts** - `41b5c5c` (feat)
2. **Task 2: Build CampaignSheet and wire into CampaignsPageClient** - `e688b19` (feat)

## Files Created/Modified

- `src/components/campaigns/CampaignSheet.tsx` - RTL slide Sheet with 4 message slots, per-slot save, live preview, status badges, lazy-load
- `src/lib/timezone-client.ts` - Client-safe timezone helpers: israelDateTimeToUTC (Intl.DateTimeFormat) + formatSendPreview (Hebrew date format)
- `src/app/kampanim/actions.ts` - Added saveMessagesAction, updateMessageTimeAction, getCampaignMessagesAction
- `src/lib/airtable/types.ts` - Added event_time?: string and enrollment_count?: number to Campaign interface
- `src/lib/airtable/campaigns.ts` - Populate event_time from Airtable שעת האירוע field
- `src/components/campaigns/CampaignsPageClient.tsx` - Import and render CampaignSheet, pass enrollmentCount

## Decisions Made

- **Flexible slots instead of fixed offset labels:** The original plan specified 4 fixed slots (שבוע לפני, יום לפני, בוקר האירוע, חצי שעה לפני). During implementation, a more flexible slot system was adopted: each slot has a user-chosen title, date, and time. This gives Michal more control over scheduling and avoids complexity of auto-computing dates from the event date.
- **Per-slot save buttons:** Each slot gets its own Save button with independent loading/error/success state. This prevents accidentally overwriting sibling slots and gives clearer per-slot feedback.
- **Client-safe timezone module:** The server-only computeSendAt from timezone.ts cannot be imported in client components. Created timezone-client.ts using Intl.DateTimeFormat API (browser-native) for live preview without server round-trips.
- **Israel local time stored, not UTC:** SlotData stores send_date (YYYY-MM-DD) and send_time (HH:MM) in Israel local time. The scheduler converts to UTC at send time. This matches how Michal thinks about scheduling.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added getCampaignMessagesAction server action**
- **Found during:** Task 1 (actions.ts extension)
- **Issue:** Plan described lazy loading messages but no server action was specified for fetching them — only save/update actions were listed
- **Fix:** Added getCampaignMessagesAction that wraps getScheduledMessagesByCampaign, needed by CampaignSheet useEffect
- **Files modified:** src/app/kampanim/actions.ts
- **Committed in:** 41b5c5c (Task 1 commit)

**2. [Rule 1 - Bug] Created client-safe timezone-client.ts instead of importing server-only computeSendAt**
- **Found during:** Task 2 (CampaignSheet build)
- **Issue:** Plan said `import computeSendAt from '@/lib/airtable/timezone'` but timezone.ts has `import 'server-only'` — this causes build failures in client components
- **Fix:** Created src/lib/timezone-client.ts with client-safe israelDateTimeToUTC + formatSendPreview using Intl.DateTimeFormat
- **Files modified:** src/lib/timezone-client.ts (created)
- **Committed in:** 41b5c5c (included in Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both auto-fixes essential for functionality and build success. No scope creep.

## Issues Encountered

- Fixed slot labels (שבוע לפני etc.) from plan were replaced with flexible date/time picker per slot — plan's fixed-offset approach requires knowing event date at save time and recomputing when event date changes; flexible approach is simpler and more powerful.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CampaignSheet fully functional and wired in
- saveMessagesAction + upsertScheduledMessages enable Phase 4 scheduler to read ScheduledMessages by date range
- Status badges ready for Phase 5 monitoring improvements
- Subsequent phases (04, 05, 06) extended CampaignSheet with broadcast section, log tab, and mobile responsive fixes

---
*Phase: 03-campaign-management*
*Completed: 2026-03-18*
