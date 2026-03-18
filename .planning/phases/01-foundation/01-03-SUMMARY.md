---
phase: 01-foundation
plan: 03
subsystem: ui
tags: [nextjs, airtable, rtl, hebrew, tailwind, shadcn, lucide-react, server-only, jest, ts-jest]

# Dependency graph
requires:
  - phase: 01-foundation-01
    provides: Next.js 16 project with Tailwind 4, shadcn/ui, TypeScript configured
  - phase: 01-foundation-02
    provides: Airtable base with 5 tables created and seeded; field API names confirmed
provides:
  - Server-only Airtable service layer (getCampaigns, getCampaignById, getContacts, getContactById)
  - TypeScript interfaces for all 5 Airtable table record shapes
  - Hebrew RTL dashboard layout with right-side sidebar and 4 navigation routes
  - Settings page with step-by-step Hebrew guides for GREEN API and MAKE.com webhook
  - Mobile overlay sidebar via shadcn Sheet component
affects:
  - 02-contacts (extends getContacts, adds createContact)
  - 03-campaigns (extends getCampaigns, adds createCampaign)
  - 04-whatsapp (references hagdarot Settings page guides)

# Tech tracking
tech-stack:
  added:
    - server-only (Next.js server guard package)
    - airtable (npm SDK, used server-side only)
    - jest + ts-jest (unit test infrastructure for service layer)
    - lucide-react (icons: LayoutDashboard, Megaphone, Users, Settings)
    - shadcn/ui Sheet (mobile sidebar overlay)
    - shadcn/ui Card (dashboard stat cards and GREEN API status card)
  patterns:
    - Server-only import guard: `import 'server-only'` at top of Airtable client prevents accidental client-side use
    - RTL flex layout: `dir="rtl"` on `<html>` + plain `flex` on container — browser RTL reversal places sidebar on right without flex-row-reverse
    - Airtable singleton: one base instance created at module level, reused across all service functions
    - TDD (RED then GREEN): failing tests committed first, then implementation to pass them

key-files:
  created:
    - src/lib/airtable/client.ts
    - src/lib/airtable/types.ts
    - src/lib/airtable/campaigns.ts
    - src/lib/airtable/contacts.ts
    - src/lib/airtable/__tests__/campaigns.test.ts
    - src/components/layout/Sidebar.tsx
    - src/components/layout/MobileHeader.tsx
    - src/app/kampanim/page.tsx
    - src/app/anshei-kesher/page.tsx
    - src/app/hagdarot/page.tsx
  modified:
    - src/app/layout.tsx
    - src/app/page.tsx

key-decisions:
  - "RTL sidebar positioning: use plain flex (not flex-row-reverse) when html[dir=rtl] is set — the browser's RTL rendering already reverses flex row direction; double-reversal placed sidebar on LEFT"
  - "Feminine Hebrew greeting: ברוכה הבאה (not ברוך הבא) — Michal is female; gender must match in Hebrew"
  - "server-only package enforces Airtable token stays server-side — imported in client.ts so any accidental client import throws at build time"
  - "Airtable linked record fields return string[] arrays — typed as string[] in all interfaces (CampaignEnrollment, ScheduledMessage, MessageLog)"

patterns-established:
  - "RTL layout pattern: html[dir=rtl] + flex container = sidebar on right naturally; do NOT use flex-row-reverse"
  - "Server-only service layer: all Airtable access via src/lib/airtable/*.ts, never in client components or API routes that could be called client-side"
  - "Hebrew text: use feminine forms throughout (ברוכה הבאה, etc.) — user Michal is female"
  - "TDD pattern: RED commit (failing tests) then GREEN commit (implementation) for service layer functions"

requirements-completed: [INFRA-03, UX-03]

# Metrics
duration: ~45min
completed: 2026-03-18
---

# Phase 1 Plan 03: Hebrew RTL Dashboard and Airtable Service Layer Summary

**Server-only Airtable service layer with `import 'server-only'` guard + Hebrew RTL dashboard shell with right-side sidebar, 4 navigation routes, and Settings page with GREEN API and MAKE.com integration guides**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-03-18T07:46:55Z
- **Completed:** 2026-03-18T08:07:36Z
- **Tasks:** 3 (including human verification + fix iteration)
- **Files modified:** 12

## Accomplishments

- Typed server-only Airtable service layer — `import 'server-only'` throws at build if used in a client component; Airtable API token never reaches the browser
- Hebrew RTL dashboard layout with persistent right-side sidebar (desktop) and Sheet overlay (mobile) — 4 routes: /, /kampanim, /anshei-kesher, /hagdarot
- Settings page (/hagdarot) with complete step-by-step Hebrew guides for GREEN API setup and MAKE.com webhook configuration — Michal can self-configure without external help
- Fixed RTL sidebar position bug found during human verification (flex-row-reverse + dir=rtl double-reversal)
- Fixed feminine Hebrew greeting (ברוכה הבאה, מיכל) found during human verification

## Route Structure

| File | URL Route | Content |
|------|-----------|---------|
| src/app/page.tsx | / | Dashboard overview with 3 stat cards and GREEN API status |
| src/app/kampanim/page.tsx | /kampanim | Campaigns placeholder "בקרוב" |
| src/app/anshei-kesher/page.tsx | /anshei-kesher | Contacts placeholder "בקרוב" |
| src/app/hagdarot/page.tsx | /hagdarot | Settings: GREEN API + MAKE.com guides |

## Service Layer Exports

Function signatures for Phase 2 to extend:

```typescript
// src/lib/airtable/campaigns.ts
export async function getCampaigns(): Promise<Campaign[]>
export async function getCampaignById(id: string): Promise<Campaign | null>

// src/lib/airtable/contacts.ts
export async function getContacts(): Promise<Contact[]>
export async function getContactById(id: string): Promise<Contact | null>

// src/lib/airtable/types.ts
export interface Campaign { id, campaign_name, event_date, description?, status, created_at }
export interface Contact { id, full_name, phone, joined_date?, notes?, created_at }
export interface CampaignEnrollment { id, campaign_id: string[], contact_id: string[], enrolled_at?, source }
export interface ScheduledMessage { id, campaign_id: string[], contact_id: string[], message_content, send_at, offset_label, status, sent_at? }
export interface MessageLog { id, scheduled_message_id: string[], contact_id: string[], campaign_id: string[], status, green_api_response?, error_message?, logged_at }
```

## shadcn/ui Components Used

- `Card`, `CardContent`, `CardHeader`, `CardTitle` — stat cards on dashboard and GREEN API status
- `Sheet`, `SheetContent`, `SheetTrigger` — mobile sidebar overlay

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests for Airtable service layer** - `a9c5e4a` (test)
2. **Task 1 GREEN: Server-only Airtable service layer** - `6e03702` (feat)
3. **Task 2: Hebrew RTL layout, sidebar, Settings page** - `cdd0295` (feat)
4. **Task 3 Fix: RTL sidebar position + feminine greeting** - `27afc6d` (fix)

## Files Created/Modified

- `src/lib/airtable/client.ts` — Server-only Airtable base singleton with env var guard
- `src/lib/airtable/types.ts` — TypeScript interfaces for all 5 Airtable tables
- `src/lib/airtable/campaigns.ts` — getCampaigns() and getCampaignById() server functions
- `src/lib/airtable/contacts.ts` — getContacts() and getContactById() server functions
- `src/lib/airtable/__tests__/campaigns.test.ts` — Unit tests with mocked airtableBase
- `src/components/layout/Sidebar.tsx` — RTL sidebar with nav items + SidebarContent for mobile Sheet
- `src/components/layout/MobileHeader.tsx` — Mobile hamburger button that opens Sidebar as Sheet overlay
- `src/app/layout.tsx` — Root layout: html[lang=he dir=rtl], flex container, Sidebar + MobileHeader
- `src/app/page.tsx` — Dashboard overview with stat cards and GREEN API status indicator
- `src/app/kampanim/page.tsx` — Campaigns placeholder page
- `src/app/anshei-kesher/page.tsx` — Contacts placeholder page
- `src/app/hagdarot/page.tsx` — Settings page with GREEN API and MAKE.com step-by-step guides

## Decisions Made

- **RTL sidebar positioning:** `dir="rtl"` on `<html>` causes browsers to reverse flex row direction. Using `flex-row-reverse` ALSO reverses it, placing the sidebar on the LEFT (double reversal). Correct approach: plain `flex` with `dir="rtl"` naturally puts sidebar on right.
- **Feminine Hebrew forms throughout:** Michal is female — all greetings, labels, and copy must use feminine grammatical forms (ברוכה הבאה, not ברוך הבא).
- **server-only guard:** The `server-only` npm package makes any accidental client-side import throw at Next.js build time — stronger than a comment warning.

## Deviations from Plan

### Auto-fixed Issues (Post Verification)

**1. [Rule 1 - Bug] RTL sidebar appeared on LEFT instead of RIGHT**
- **Found during:** Task 3 (human verification)
- **Issue:** layout.tsx used `flex flex-row-reverse` — but `dir="rtl"` on the html element already reverses flex row direction. The double-reversal placed the sidebar on the LEFT.
- **Fix:** Removed `flex-row-reverse`, kept plain `flex` — browser RTL handling places sidebar correctly on the right.
- **Files modified:** src/app/layout.tsx
- **Verification:** npm run build exits 0; visual inspection after fix
- **Committed in:** 27afc6d

**2. [Rule 1 - Bug] Welcome message used masculine Hebrew form**
- **Found during:** Task 3 (human verification)
- **Issue:** page.tsx had "ברוך הבא, מיכל" (masculine) — Michal is female, should be "ברוכה הבאה, מיכל" (feminine)
- **Fix:** Changed greeting to feminine form
- **Files modified:** src/app/page.tsx
- **Verification:** Build passes; text updated correctly
- **Committed in:** 27afc6d

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug, found during human verification checkpoint)
**Impact on plan:** Both fixes corrected factual errors in the initial implementation. No scope creep.

## Issues Encountered

- The plan's Task 2 spec said "flex-row-reverse" explicitly but this conflicted with how `dir="rtl"` interacts with flex layout. The plan was incorrect; actual RTL browser behavior takes precedence. Fixed during human verification.

## User Setup Required

None for this plan — Airtable base was already created in Plan 02. Environment variables (AIRTABLE_API_TOKEN, AIRTABLE_BASE_ID) documented in Plan 01 setup.

## Next Phase Readiness

- Airtable service layer is ready for Phase 2 to extend with `createContact()` and enrollment functions
- RTL layout shell is complete — Phase 2 will add data tables inside the existing layout
- Settings page guides are static for now — Phase 4 will make GREEN API status live
- `NEXT_PUBLIC_APP_URL` env var referenced in /hagdarot page — must be set in Railway before MAKE.com webhook URL display works

---
*Phase: 01-foundation*
*Completed: 2026-03-18*
