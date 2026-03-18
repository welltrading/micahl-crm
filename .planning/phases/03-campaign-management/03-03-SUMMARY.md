---
phase: 03-campaign-management
plan: 03
subsystem: campaigns-ui
tags: [campaigns, ui, server-component, server-action, modal, card-grid, hebrew-rtl]

# Dependency graph
requires:
  - phase: 03-campaign-management
    plan: 02
    provides: createCampaign, getCampaigns, getEnrollmentCountsByCampaign (Airtable service layer)
provides:
  - KampaninPage: server component at /kampanim fetching campaigns + enrollment counts
  - createCampaignAction: Server Action validating and creating campaign via Airtable
  - CampaignsPageClient: card grid with selectedCampaign state and modal trigger
  - CampaignCard: campaign card with status badge, Israeli date, enrollment count, description
  - CreateCampaignModal: Dialog form with native date picker, time select, Hebrew labels
affects:
  - 03-04 (CampaignSheet — will use selectedCampaign state already wired in CampaignsPageClient)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - force-dynamic on kampanim page — campaigns always fresh after creation
    - Promise.all for parallel getCampaigns + getEnrollmentCountsByCampaign fetching
    - Native <input type="date"> with dir="ltr" — avoids @base-ui/react Calendar (not in v1.3.0)
    - Time select with 48 options (every 30 min) via Array.from
    - CAMPAIGN_STATUS_BADGE/LABEL constants — mirrors ContactDetailPanel STATUS_BADGE_CLASS pattern
    - createCampaignAction returns { campaign } | { error } union type

key-files:
  created:
    - src/app/kampanim/actions.ts
    - src/components/campaigns/CampaignCard.tsx
    - src/components/campaigns/CampaignsPageClient.tsx
    - src/components/campaigns/CreateCampaignModal.tsx
  modified:
    - src/app/kampanim/page.tsx

key-decisions:
  - "Native <input type=\"date\"> used for date selection — @base-ui/react Calendar not shipped in v1.3.0 (confirmed Research.md critical finding)"
  - "selectedCampaign state wired in CampaignsPageClient now — Plan 04 CampaignSheet requires no component refactor"
  - "CampaignSheet placeholder renders null when selectedCampaign is null — Plan 04 fills in Sheet content"

# Metrics
duration: 10min
completed: 2026-03-18
---

# Phase 3 Plan 03: Campaigns List Page Summary

**Campaigns list page at /kampanim: server component with Promise.all fetch, card grid with status badges and Israeli dates, create modal with native date picker and time select, Server Action creating campaigns in Airtable.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-18T11:49:24Z
- **Completed:** 2026-03-18
- **Tasks:** 3 of 3 (2 auto + 1 human-verify checkpoint)
- **Files created/modified:** 5

## Accomplishments

- `src/app/kampanim/page.tsx`: replaced placeholder with server component using `force-dynamic`, parallel fetch of campaigns + enrollment counts via `Promise.all`
- `src/app/kampanim/actions.ts`: `createCampaignAction` Server Action with validation (campaign_name, event_date, event_time required), try/catch error handling, returns `{ campaign } | { error }`
- `src/components/campaigns/CampaignCard.tsx`: card with `CAMPAIGN_STATUS_BADGE`/`CAMPAIGN_STATUS_LABEL` constants, `toLocaleDateString('he-IL')` date formatting in Asia/Jerusalem timezone, enrollment count, description truncated at 80 chars, fully clickable
- `src/components/campaigns/CampaignsPageClient.tsx`: card grid (1/2/3 columns responsive), `selectedCampaign` state, `isCreateModalOpen` state, empty state message, `router.refresh()` after creation, CampaignSheet null placeholder
- `src/components/campaigns/CreateCampaignModal.tsx`: `@base-ui/react/dialog` Dialog pattern (mirrors AddContactModal), native `<input type="date">` with `dir="ltr"`, 48-option time select (00:00–23:30), Hebrew labels, loading state disables submit, inline error display

## Task Commits

1. **Task 1: Campaigns page server component and Server Action** - `817d776`
2. **Task 2: CampaignCard, CampaignsPageClient, CreateCampaignModal** - `18f556d`

## Files Created/Modified

- `src/app/kampanim/page.tsx` — Server component: force-dynamic, Promise.all fetch, renders CampaignsPageClient
- `src/app/kampanim/actions.ts` — createCampaignAction: validates 3 required fields, calls createCampaign, returns union type
- `src/components/campaigns/CampaignCard.tsx` — Card with CAMPAIGN_STATUS_BADGE constants, Israeli date, enrollment count, 80-char description truncation
- `src/components/campaigns/CampaignsPageClient.tsx` — Grid with selectedCampaign/isCreateModalOpen state, empty state, modal + sheet wiring
- `src/components/campaigns/CreateCampaignModal.tsx` — Dialog form: native date input (dir=ltr), 30-min time select, createCampaignAction, Hebrew feminine submit

## Decisions Made

- **Native `<input type="date">` for date selection:** Research confirmed `@base-ui/react` v1.3.0 has no Calendar component. Native input returns YYYY-MM-DD string which is exactly what `createCampaign()` expects.
- **selectedCampaign state wired in CampaignsPageClient now:** Same pattern as Phase 2 ContactsPageClient. Plan 04 CampaignSheet will use this state without requiring component refactor.
- **CampaignSheet placeholder is `null` conditional:** Keeps the component contract clear for Plan 04 to fill in.

## Deviations from Plan

None — plan executed exactly as written.

## Pre-existing Issues Found (Out of Scope)

- `src/lib/airtable/scheduled-messages.ts` line 68: TypeScript error TS2769 (`Record<string, unknown>` not assignable to `Partial<FieldSet>`) — pre-existing from Plan 02, not caused by this plan's changes. All 29 tests still pass. Deferred.

## Verification Status

- TypeScript: All 5 new/modified files compile without errors (scheduled-messages.ts error is pre-existing)
- Tests: 29/29 pass (campaigns, scheduled-messages, timezone test suites)
- Human verify: APPROVED — user verified /kampanim page, campaign creation flow, and Airtable record creation

## Self-Check: PASSED

Files exist:
- src/app/kampanim/page.tsx: FOUND
- src/app/kampanim/actions.ts: FOUND
- src/components/campaigns/CampaignCard.tsx: FOUND
- src/components/campaigns/CampaignsPageClient.tsx: FOUND
- src/components/campaigns/CreateCampaignModal.tsx: FOUND

Commits exist:
- 817d776: FOUND (feat(03-03): campaigns page server component and createCampaignAction)
- 18f556d: FOUND (feat(03-03): CampaignCard, CampaignsPageClient, CreateCampaignModal)
