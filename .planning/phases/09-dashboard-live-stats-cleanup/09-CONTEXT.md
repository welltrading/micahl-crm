# Phase 9: Dashboard Live Stats + Dead Code Cleanup - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

הפיכת הדאשבורד הראשי (`/`) לדאשבורד ויזואלי עם נתונים חיים — 4 כרטיסי סיכום גלובלי, לוח קמפיינים עם נתוני נרשמות/מתעניינות/המרה, וסטטוס GREEN API תמידי.
בנוסף: מחיקת קוד מת (`upsertScheduledMessages`, `updateMessageTimeAction`) כולל הטסטים שלהם.

</domain>

<decisions>
## Implementation Decisions

### כרטיסי סיכום גלובלי (שורה עליונה)
- 4 כרטיסים: **סה"כ נרשמות**, **מתעניינות פעילות**, **קמפיינים פעילים/עתידיים**, **הודעות שנשלחו החודש**
- "הודעות שנשלחו החודש" — ספירת סטטוס `sent` בלבד מ-MessageLog, בחודש הקלנדרי הנוכחי (לא כישלונות)
- "מתעניינות פעילות" — סה"כ מכל הקמפיינים (getInterestedCount קיים)
- "קמפיינים פעילים/עתידיים" — status === 'active' || 'future'

### לוח קמפיינים
- מציג **כל** הקמפיינים (כולל שהסתיימו)
- עיצוב כרטיסים — אותו pattern כמו בדף הקמפיינים (`/kampanim`)
- כל כרטיס מציג: שם, סטטוס + תאריך אירוע, נרשמות + מתעניינות, % המרה (נרשמות ÷ מתעניינות), הודעות שנשלחו

### סטטוס GREEN API
- מוצג **תמיד** בדאשבורד (לא רק בעת שגיאה)
- אותו עיצוב כמו בדף ההגדרות — נקודה צבעונית + טקסט (ירוק/אדום/אפור)

### מחיקת קוד מת
- מחיקת `upsertScheduledMessages` מ-`src/lib/airtable/scheduled-messages.ts`
- מחיקת הטסטים של `upsertScheduledMessages` מ-`src/lib/airtable/__tests__/scheduled-messages.test.ts`
- מחיקת `updateMessageTimeAction` מ-`src/app/kampanim/actions.ts` (אין קוראים)

### Claude's Discretion
- עיצוב פנימי של כרטיסי הקמפיינים (spacing, typography, צבע badge סטטוס)
- handling של קמפיין בלי מתעניינות (מחלקה ב-0, הצג "—" במקום %)
- skeleton loading states
- פונקציית service חדשה לספירת הודעות חודשיות (שם, signature)

</decisions>

<specifics>
## Specific Ideas

- כרטיסי הקמפיינים בדאשבורד צריכים להיראות כמו אלה בדף `/kampanim` — עקביות ויזואלית
- "% המרה" = נרשמות ÷ מתעניינות × 100, עגול למספר שלם

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getGreenApiState()` — `src/lib/airtable/green-api.ts` — מוכן לשימוש ישיר ב-page.tsx
- `getInterestedCount()` — `src/lib/airtable/campaigns.ts` — סה"כ מתעניינות גלובלי
- `getInterestedCountByCampaign(campaignId)` — `src/lib/airtable/campaigns.ts` — לכרטיס קמפיין בודד
- `getEnrollmentCountsByCampaign()` — `src/lib/airtable/campaigns.ts` — Record<campaignId, count>
- `getCampaigns()` — כבר נקרא ב-page.tsx
- `getContacts()` — כבר נקרא ב-page.tsx
- `getMessageLogByCampaign(campaignId)` — `src/lib/airtable/message-log.ts` — per-campaign, לא global
- `Card`, `CardContent`, `CardHeader`, `CardTitle` — `src/components/ui/card` — קיים ומשומש

### Established Patterns
- Dashboard page (`src/app/page.tsx`) הוא Server Component עם `force-dynamic` — data fetch ישירות בקומפוננטה
- סטטוס badge: `deriveCampaignStatus()` מחשב status מ-event_date — לא שדה ב-Airtable
- RTL: Tailwind logical properties (`ms-*`, `ps-*`), `dir=rtl` על `<html>`

### Integration Points
- **חדש נדרש:** פונקציית service לספירת הודעות חודשיות (`getMessagesSentThisMonth`) — MessageLog query עם filter לפי `logged_at` בחודש הנוכחי וסטטוס `נשלחה`
- **חדש נדרש:** לכרטיסי קמפיינים בדאשבורד — צריך נתוני מתעניינות per-campaign. `getInterestedCountByCampaign` קיים אבל עושה קריאה נפרדת לכל קמפיין; לשקול `getInterestedCountsAllCampaigns` batch כדי להמנע מ-N+1

### Dead Code Locations
- `upsertScheduledMessages`: `src/lib/airtable/scheduled-messages.ts:38`
- Tests: `src/lib/airtable/__tests__/scheduled-messages.test.ts` — כל ה-`describe('upsertScheduledMessages', ...)` block
- `updateMessageTimeAction`: `src/app/kampanim/actions.ts:129` — אין קוראים בשום מקום

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-dashboard-live-stats-cleanup*
*Context gathered: 2026-03-25*
