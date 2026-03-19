# Phase 6: Stats + Polish - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

הוספת טבלת צמיחה היסטורית (הצטרפויות לפי חודש) בדף אנשי קשר, ו-mobile responsive polish כדי שרשימות יהיו קריאות בנייד. ניווט כבר עובד במובייל (MobileHeader + Sidebar קיימים) — Phase זה מטפל בקריאות התוכן.

</domain>

<decisions>
## Implementation Decisions

### Growth visualization — פורמט
- טבלה (לא גרף/bar chart) — אין צורך ב-chart library חדשה
- שתי עמודות: חודש + כמה הצטרפו
- מציגה רק חודשים שיש בהם הצטרפויות (לא שורות ריקות עם 0)
- מיון: הכי חדש למעלה (descending)
- מיקום: בדף אנשי קשר — מתחת לכרטיסי הסטטיסטיקות הקיימים (סך, החודש, השבוע)

### Growth visualization — טווח תאריכים
- date picker חופשי: שני שדות From/To (`<input type="date">`)
- ברירת מחדל: 3 חודשים אחרונים (from = today - 3 months, to = today)
- אותו pattern של `<input type="date">` כמו CreateCampaignModal — עקביות

### Mobile responsive scope
- מיכל עובדת בעיקר מדסקטופ — mobile הוא "צפוי בסיסי"
- הכי חשוב: רשימת קמפיינים ורשימת אנשי קשר קריאות בנייד
- ללא גלילה אופקית, טקסט לא חתוך
- ניווט כבר עובד (MobileHeader + Sidebar hidden md:flex — קיים)

### Claude's Discretion
- פורמט הצגת שמות חודשים בטבלה (ינואר 2026 vs 01/2026)
- סגנון כרטיס/container לטבלת הצמיחה
- בדיקה ותיקון ספציפיים של רכיבים שבורים במובייל (ContactDetailPanel, AddContactModal, CreateCampaignModal) — תנוע לפי מה שנמצא בפועל
- padding adjustments בדפים במובייל

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/card.tsx`: Card component — use for the growth table container (same as existing stat cards)
- `src/components/contacts/ContactsPageClient.tsx`: Current stats cards + `isThisMonth`/`isThisWeek` helpers — growth table goes here, date range filter added client-side
- `src/lib/airtable/contacts.ts`: `getContacts()` returns all contacts with `created_at` — growth aggregation computed client-side from existing data (no new Airtable call)
- `src/components/layout/MobileHeader.tsx`: Already handles mobile nav (hamburger + Sheet) — no changes needed
- `src/components/layout/Sidebar.tsx`: Already `hidden md:flex` — correct

### Established Patterns
- `<input type="date">` for date selection (Phase 3 CreateCampaignModal) — use same pattern for From/To date picker
- `grid grid-cols-1 gap-4 sm:grid-cols-3` for stat cards — already responsive
- `overflow-x-auto` on ContactsTable — already handles horizontal scroll
- `CampaignSheet`: `w-full sm:max-w-lg` — already mobile-safe
- `ContactDetailPanel`: `side="left"` without explicit width — may need `w-full sm:max-w-md` check

### Integration Points
- Growth table: client-side aggregation in `ContactsPageClient.tsx` from existing `contacts` prop — zero new Airtable calls
- Date range state: two `useState` for from/to dates, filter `contacts` array before aggregating
- Mobile fixes: targeted per-component — no architectural changes

</code_context>

<specifics>
## Specific Ideas

- Growth table מחשבת הכל client-side מתוך ה-`contacts` array הקיים — לא נדרש fetch נוסף
- ברירת מחדל 3 חודשים: `from = new Date(); from.setMonth(from.getMonth() - 3)`
- date picker inputs עם label "מ-" ו-"עד" (RTL)

</specifics>

<deferred>
## Deferred Ideas

- Airtable Dashboard charts — המשתמשת שאלה על אפשרות זו אבל בחרה לשמור הכל בדאשבורד המובנה
- הוספת עמודת "סך מצטבר" לטבלת הצמיחה — future nice-to-have

</deferred>

---

*Phase: 06-stats-polish*
*Context gathered: 2026-03-19*
