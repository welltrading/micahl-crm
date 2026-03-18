---
phase: 02-contact-crm
plan: 03
subsystem: ui
tags: [react, next.js, server-actions, tdd, contacts, rtl, airtable, hebrew]

requires:
  - phase: 02-contact-crm/02-01
    provides: normalizePhone, formatPhoneDisplay, createContact, getContacts

provides:
  - addContact Server Action with duplicate phone detection (Hebrew error messages)
  - /anshei-kesher contacts page: 3 stat cards, RTL table, search, add-contact modal

affects:
  - 02-04 (contact detail side panel — selectedContact state already wired in ContactsPageClient)

tech-stack:
  added: []
  patterns:
    - Server Component (page.tsx) fetches, passes data to Client Component (ContactsPageClient)
    - Server Action ('use server') for mutations; client uses router.refresh() after success
    - @base-ui/react/dialog used directly (no shadcn wrapper) for AddContactModal
    - dir="ltr" on phone inputs/cells to preserve number display direction inside RTL layout
    - force-dynamic export to prevent caching on webhook-updated data

key-files:
  created:
    - src/app/anshei-kesher/actions.ts
    - src/app/anshei-kesher/__tests__/actions.test.ts
    - src/components/contacts/ContactsPageClient.tsx
    - src/components/contacts/ContactsTable.tsx
    - src/components/contacts/AddContactModal.tsx
  modified:
    - src/app/anshei-kesher/page.tsx

key-decisions:
  - "createContact takes object {full_name, phone} not positional args — plan had positional args; adapted to match 02-01 implementation"
  - "Phone display cells use dir=ltr to keep 050-123-4567 reading left-to-right inside RTL table"
  - "selectedContact state wired in ContactsPageClient now for 02-04 to use without refactor"
  - "force-dynamic on page to ensure contacts always fresh after webhook additions"

patterns-established:
  - "RTL table: first column in JSX = rightmost visual. No flex-row-reverse."
  - "Server Action pattern: validate → normalize → check duplicate → create → revalidatePath → return { success: true }"

requirements-completed:
  - CONT-01
  - CONT-03
  - UX-01

duration: 5min
completed: "2026-03-18"
---

# Phase 2 Plan 03: Contact CRM List Page Summary

**Hebrew RTL contacts page at /anshei-kesher: stat cards (total/month/week), searchable table with phone formatting, addContact Server Action with duplicate detection returning Hebrew error messages.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-18T08:57:11Z
- **Completed:** 2026-03-18T09:02:00Z (pending human verify checkpoint)
- **Tasks:** 2/3 (Task 3 is human-verify checkpoint)
- **Files modified:** 6

## Accomplishments

- TDD Server Action: addContact validates name, normalizes both phones before duplicate check, returns Hebrew errors
- ContactsPageClient: real-time search (name + phone), 3 stat cards derived client-side from contacts array
- RTL-correct table with formatPhoneDisplay (972XXXXXXXXXX → 050-XXX-XXXX), Hebrew empty state
- AddContactModal: @base-ui/react/dialog, disable-during-submit, error display, router.refresh on success
- 51/51 tests passing, build clean

## Task Commits

1. **Task 1 (RED): addContact failing tests** - `3fbb13c` (test)
2. **Task 1 (GREEN): addContact implementation** - `8279aef` (feat)
3. **Task 2: Contacts page components** - `28d5920` (feat)

## Files Created/Modified

- `src/app/anshei-kesher/actions.ts` - 'use server' addContact with duplicate check
- `src/app/anshei-kesher/__tests__/actions.test.ts` - 6 TDD tests for Server Action
- `src/app/anshei-kesher/page.tsx` - Server component, force-dynamic, passes contacts to client
- `src/components/contacts/ContactsPageClient.tsx` - Client shell: stats, search, modal state
- `src/components/contacts/ContactsTable.tsx` - RTL table, formatPhoneDisplay, hover state
- `src/components/contacts/AddContactModal.tsx` - Hebrew form modal, duplicate error UX

## Decisions Made

- `createContact` takes `{ full_name, phone }` object (not positional args as plan suggested) — adapted to match the actual 02-01 implementation signature
- Phone number cells use `dir="ltr"` to prevent RTL layout from reversing the digit order in `050-123-4567`
- `selectedContact` state already wired in ContactsPageClient so plan 02-04 (detail panel) requires no refactor

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adapted createContact call to match object signature**
- **Found during:** Task 1 (addContact server action)
- **Issue:** Plan showed `createContact(fullName.trim(), normalized)` (two positional args), but 02-01 implemented `createContact({ full_name, phone })` object
- **Fix:** Used object signature `createContact({ full_name: fullName.trim(), phone: normalized })`
- **Files modified:** src/app/anshei-kesher/actions.ts
- **Verification:** 6/6 tests pass, build clean
- **Committed in:** 8279aef (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - signature mismatch between plan code sample and actual implementation)
**Impact on plan:** Minor correctness fix, no scope change.

## Issues Encountered

None.

## User Setup Required

None - no new external service configuration required.

## Next Phase Readiness

- 02-04 can build contact detail side panel using `onContactClick` / `setSelectedContact` already wired in ContactsPageClient
- `getContactEnrollments` and `getContactMessages` (from 02-01) ready for detail panel
- All 51 tests passing, build clean

---
*Phase: 02-contact-crm*
*Completed: 2026-03-18*

## Self-Check: PENDING HUMAN VERIFY CHECKPOINT

Files created:
- src/app/anshei-kesher/actions.ts - FOUND
- src/app/anshei-kesher/__tests__/actions.test.ts - FOUND
- src/components/contacts/ContactsPageClient.tsx - FOUND
- src/components/contacts/ContactsTable.tsx - FOUND
- src/components/contacts/AddContactModal.tsx - FOUND
- src/app/anshei-kesher/page.tsx (modified) - FOUND

Commits:
- 3fbb13c (RED) - FOUND
- 8279aef (GREEN) - FOUND
- 28d5920 (feat) - FOUND

Build: PASSED (no TypeScript errors)
Tests: 51/51 passing
