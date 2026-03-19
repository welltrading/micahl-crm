---
phase: 05-monitoring-error-ux
verified: 2026-03-19T12:30:00Z
status: human_needed
score: 15/15 must-haves verified
re_verification: false
human_verification:
  - test: "GREEN API disconnect banner — visual and navigation"
    expected: "Amber banner 'גרין אפיאי מנותקת — הודעות לא ישלחו' appears at top of /kampanim when GREEN API returns notAuthorized. 'הגדרות' link navigates to /hagdarot. No banner when authorized or unknown."
    why_human: "Banner visibility depends on GREEN API live state at render time. Requires browser and either a real disconnected GREEN API instance or temporarily invalidating env vars."
  - test: "יומן שליחות tab — lazy load, table display, toggle behavior"
    expected: "CampaignSheet shows two tabs. Clicking 'יומן שליחות' shows loading state then either 5-column table or empty state. 'רק כשלונות' checkbox filters without network call. Switching campaigns resets log (no stale data)."
    why_human: "Tab switching, lazy load timing, and toggle behavior require browser interaction. Error message Hebrew rendering (mapErrorToHebrew) requires a campaign with failed log entries."
---

# Phase 5: Monitoring & Error UX Verification Report

**Phase Goal:** מיכל יכולה לעקוב אחרי מצב כל הודעה, לדעת מי לא קיבל, ולהבין שגיאות בשפה פשוטה — לא קודי שגיאה
**Verified:** 2026-03-19T12:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | getMessageLogByCampaign returns MessageLogDisplayEntry[] sorted by logged_at desc | VERIFIED | message-log.ts lines 56-82: client-side sort by `b.logged_at.localeCompare(a.logged_at)` |
| 2 | mapErrorToHebrew maps 401/notAuthorized to Hebrew 'גרין אפיאי מנותקת' | VERIFIED | message-log-client.ts lines 20-22: pattern check for '401', 'notauthorized', 'unauthorized' |
| 3 | mapErrorToHebrew maps 403/not-registered to Hebrew 'מספר הטלפון לא קיים בוואצאפ' | VERIFIED | message-log-client.ts lines 23-25: pattern check for '403', 'not registered', 'notregistered' |
| 4 | mapErrorToHebrew maps network/timeout errors to Hebrew 'בעיית תקשורת זמנית' | VERIFIED | message-log-client.ts lines 26-32: pattern check for 'timeout', 'econnrefused', 'network', 'fetch' |
| 5 | mapErrorToHebrew returns 'שגיאה לא ידועה' fallback for unknown errors | VERIFIED | message-log-client.ts line 34: fallback return |
| 6 | getCampaignLogAction wraps getMessageLogByCampaign returning {entries} or {error} | VERIFIED | actions.ts lines 172-183: full implementation with empty-id guard and catch block |
| 7 | notAuthorized state shows amber banner with link to /hagdarot on campaigns page | VERIFIED | CampaignsPageClient.tsx lines 24-31: conditional amber div, banner text exact match, href="/hagdarot" |
| 8 | Banner absent when state is 'authorized' or 'unknown' | VERIFIED | CampaignsPageClient.tsx line 24: strict equality `=== 'notAuthorized'` only |
| 9 | getGreenApiState() called once per page load at server render time | VERIFIED | page.tsx lines 8-12: called in Promise.all, no client polling |
| 10 | CampaignSheet shows two tabs: 'הודעות' and 'יומן שליחות' | VERIFIED | CampaignSheet.tsx lines 295-308: two border-b-2 tab buttons |
| 11 | Log tab lazy-loads MessageLog entries on first open only | VERIFIED | CampaignSheet.tsx lines 168-180: useEffect checks `activeTab !== 'log'` and `logEntries !== null` guard |
| 12 | Log table displays 5 columns: שם מלא, טלפון, סטטוס, זמן שליחה, סיבת שגיאה | VERIFIED | CampaignSheet.tsx lines 507-512: all 5 `<th>` headers present |
| 13 | Error column shows Hebrew via mapErrorToHebrew — not raw error code | VERIFIED | CampaignSheet.tsx line 542: `mapErrorToHebrew(entry.error_message)` in td |
| 14 | 'רק כשלונות' toggle filters already-loaded array without second Airtable call | VERIFIED | CampaignSheet.tsx lines 487-494, 516: `logEntries.filter(e => e.status === 'failed')` — no action call |
| 15 | Campaign change resets log state (no stale data) | VERIFIED | CampaignSheet.tsx lines 121-127: useEffect on `campaign?.id` resets activeTab, logEntries, logError, logLoading, showFailuresOnly |

**Score:** 15/15 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/airtable/message-log.ts` | getMessageLogByCampaign, re-exports mapErrorToHebrew and MessageLogDisplayEntry | VERIFIED | 83 lines, exports all required symbols via message-log-client.ts re-export |
| `src/lib/airtable/message-log-client.ts` | MessageLogDisplayEntry interface, mapErrorToHebrew function | VERIFIED | 36 lines, both exports present and substantive |
| `src/lib/airtable/__tests__/message-log.test.ts` | Unit tests for all behaviors | VERIFIED | 211 lines, 19 tests: 9x getMessageLogByCampaign, 6x mapErrorToHebrew, 3x getCampaignLogAction — all GREEN |
| `src/app/kampanim/actions.ts` | getCampaignLogAction server action | VERIFIED | Lines 172-183: full implementation with guard + catch |
| `src/app/kampanim/page.tsx` | Passes greenApiState prop from getGreenApiState() | VERIFIED | Lines 8-14: Promise.all includes getGreenApiState(), prop wired |
| `src/components/campaigns/CampaignsPageClient.tsx` | Renders conditional amber banner for 'notAuthorized' | VERIFIED | Lines 11-31: prop accepted, banner rendered with exact locked text |
| `src/components/campaigns/CampaignSheet.tsx` | Tab nav, lazy log load, table, toggle | VERIFIED | 573 lines, all tab/log behaviors present and wired |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| actions.ts getCampaignLogAction | message-log.ts getMessageLogByCampaign | import + await | WIRED | Line 4: `import { getMessageLogByCampaign }` + line 177: `await getMessageLogByCampaign(campaignId)` |
| message-log.ts | Airtable MessageLog table | FIND+ARRAYJOIN filterByFormula | WIRED | Line 61: `FIND("${campaignId}", ARRAYJOIN({קמפיין}))` |
| message-log.ts | message-log-client.ts | re-export | WIRED | Lines 7-9: `export type { MessageLogDisplayEntry }` and `export { mapErrorToHebrew }` |
| page.tsx | CampaignsPageClient.tsx | greenApiState prop | WIRED | Line 14: `greenApiState={greenApiState}` — passed and consumed |
| CampaignsPageClient.tsx | /hagdarot | anchor link inside banner | WIRED | Line 27: `href="/hagdarot"` |
| CampaignSheet.tsx log tab useEffect | getCampaignLogAction | import + call on activeTab === 'log' | WIRED | Line 17-18 import + line 173: `getCampaignLogAction(campaign.id)` |
| CampaignSheet.tsx error cell | mapErrorToHebrew | import + call on entry.error_message | WIRED | Line 20 import from message-log-client + line 542: `mapErrorToHebrew(entry.error_message)` |
| CampaignSheet.tsx phone cell | formatPhoneDisplay | import + call on entry.phone | WIRED | Line 21 import + line 520: `formatPhoneDisplay(entry.phone)` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| MON-01 | 05-01, 05-03 | מיכל יכולה לראות לוג שליחות — כל הודעה שנשלחה/נכשלה עם timestamp | SATISFIED | getMessageLogByCampaign fetches all log entries with logged_at. CampaignSheet renders 5-column table including זמן שליחה. |
| MON-02 | 05-03 | מיכל יכולה לראות מי לא קיבלה הודעה (נכשלה) לכל קמפיין | SATISFIED | 'רק כשלונות' checkbox filters logEntries by status === 'failed' in-memory. Failed entries show name + phone in same table. |
| MON-03 | 05-02 | סטטוס חיבור GREEN API מוצג בדאשבורד | SATISFIED | getGreenApiState() called in page.tsx Promise.all; CampaignsPageClient renders amber banner when state === 'notAuthorized'. |
| UX-04 | 05-01 | שגיאות ובעיות מוסברות בשפה פשוטה עם פעולה מוצעת — לא קודי שגיאה טכניים | SATISFIED | mapErrorToHebrew maps all raw GREEN API error patterns to actionable Hebrew strings. Applied in log table error column. |

All 4 required requirement IDs satisfied. No orphaned requirements found.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No placeholder returns, TODO comments, empty handlers, or stub implementations detected in phase 5 files.

---

### Human Verification Required

#### 1. GREEN API Disconnect Banner

**Test:** Set `GREEN_API_INSTANCE_ID` or `GREEN_API_TOKEN` to an invalid value in `.env.local`, restart dev server (`npm run dev` on port 3001), visit `http://localhost:3001/kampanim`.
**Expected:** Amber banner "גרין אפיאי מנותקת — הודעות לא ישלחו" appears at top of page. Click "הגדרות" — navigates to `/hagdarot`. Restore valid env vars — banner disappears. Clear env vars entirely (unknown state) — no banner.
**Why human:** Banner visibility depends on live GREEN API state at server render time. Cannot mock or simulate the three-state outcome (authorized/notAuthorized/unknown) without running the server.

#### 2. יומן שליחות Tab — Full Flow

**Test:** Visit `/kampanim`, open any campaign card, observe CampaignSheet.
**Expected:** Two tabs visible at top — "הודעות" and "יומן שליחות". Click "הודעות" — existing message slot view works normally. Click "יומן שליחות" — loading text "טוענת יומן שליחות..." briefly appears, then either a 5-column table (שם מלא, טלפון, סטטוס, זמן שליחה, סיבת שגיאה) or empty state "אין רשומות יומן עדיין לקמפיין זה". If failed entries exist: סיבת שגיאה column shows Hebrew text (e.g. "מספר הטלפון לא קיים בוואצאפ"), not raw error codes. Check "רק כשלונות" — only failed rows shown (record count updates), no network call. Open a different campaign — log tab resets (no previous campaign data visible).
**Why human:** Tab interaction, lazy-load timing, in-memory filter behavior, and Hebrew error message rendering all require browser and real Airtable data.

---

### Gaps Summary

No gaps. All 15 observable truths verified with substantive, wired implementations. All 4 requirement IDs (MON-01, MON-02, MON-03, UX-04) are satisfied by code that exists, is substantive, and is wired. Two items require human browser verification for visual and interaction behavior that cannot be confirmed programmatically.

---

_Verified: 2026-03-19T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
