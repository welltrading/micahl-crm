# Phase 10: Campaign Enrollees Tab - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning
**Source:** User conversation

<domain>
## Phase Boundary

הוספת טאב "נרשמות" ב-CampaignSheet שמציג את כל הרשומים לקמפיין עם פרטיהם, כולל אפשרות לביטול רישום.

</domain>

<decisions>
## Implementation Decisions

### טאב חדש
- הוספת טאב שלישי "נרשמות" ב-CampaignSheet (לצד "הודעות" ו"יומן שליחות")

### עמודות לתצוגה
- שם מלא (מטבלת איש קשר)
- טלפון (מטבלת איש קשר)
- אימייל (מטבלת איש קשר)
- אישרה וואטסאפ — שדה boolean מטבלת נרשמות (שם שדה: `אישרה וואטסאפ`)

### אינטראקציה
- תצוגה בלבד — אין לחיצה על שורה שפותחת משהו
- כפתור ביטול רישום לכל שורה (מחיקת רשומה מטבלת נרשמות)

### Claude's Discretion
- עיצוב הטבלה (עקביות עם יומן שליחות הקיים)
- טיפול ב-loading state בעת ביטול רישום
- אישור לפני מחיקה (confirm dialog)
- הודעת שגיאה בעברית אם הביטול נכשל

</decisions>

<specifics>
## Specific Ideas

- שם שדה מדויק ב-Airtable: `אישרה וואטסאפ` (טבלת נרשמות)
- נרשמות נוצרות ע"י MAKE.com אוטומציה — אין צורך ב-UI ליצירה, רק תצוגה וביטול
- מבנה קיים: `getEnrollmentsForCampaign` בcampaigns.ts מחזיר רק enrollment IDs, צריך join עם Contact

</specifics>

<deferred>
## Deferred Ideas

- לחיצה על שורה לפתיחת פאנל פרטי האיש קשר
- סינון/חיפוש בתוך הנרשמות
- ייצוא לCSV

</deferred>

---

*Phase: 10-campaign-enrollees-tab*
*Context gathered: 2026-03-22*
