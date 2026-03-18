# Requirements: מיכל CRM — WhatsApp Campaign Manager

**Defined:** 2026-03-17
**Core Value:** מיכל יוצרת קמפיין לאירוע חדש בדקות — מגדירה תאריך ותוכן, והמערכת שולחת את כל הודעות הווצאפ בזמן הנכון לכל הנרשמות.

## v1 Requirements

### UX — עצמאות תפעולית

- [x] **UX-01**: כל פעולה שגרתית (יצירת קמפיין, הגדרת הודעות, הוספת נרשמת) מתבצעת דרך ממשק ויזואלי ברור — ללא עריכת קוד, ללא גישה ל-Airtable ישירות
- [x] **UX-02**: הגדרת זמני שליחה (שבוע לפני / יום לפני / בוקר / חצי שעה לפני) מתבצעת בבחירה ויזואלית — לא בכתיבת תאריכים ידנית
- [x] **UX-03**: בעת הקמת אינטגרציה חדשה (GREEN API, MAKE.com webhook) המערכת מספקת הנחיות step-by-step בתוך הדאשבורד
- [ ] **UX-04**: שגיאות ובעיות (הודעה שנכשלה, GREEN API מנותק) מוסברות בשפה פשוטה עם פעולה מוצעת — לא קודי שגיאה טכניים

### Infrastructure (תשתית)

- [x] **INFRA-01**: Airtable base עם schema מלא — Campaigns, Contacts, Messages, MessageLog
- [x] **INFRA-02**: Next.js app מוגדר על Railway עם Bree scheduler פועל כתהליך מתמשך
- [x] **INFRA-03**: שכבת שירות (service layer) לכל גישה ל-Airtable — server-side בלבד
- [x] **INFRA-04**: Webhook endpoint שמאפשר ל-MAKE.com להוסיף נרשמת חדשה למערכת
- [x] **INFRA-05**: ניתן לראות סטטוס חיבור GREEN API בדאשבורד (מחובר / מנותק)

### Contacts — ניהול אנשי קשר

- [x] **CONT-01**: מיכל יכולה לראות רשימת כל אנשי הקשר (שם, טלפון, תאריך הצטרפות, קמפיין)
- [x] **CONT-02**: מיכל יכולה לראות לכל איש קשר אילו הודעות קיבל
- [x] **CONT-03**: מיכל יכולה לראות סטטיסטיקות בסיסיות — כמה נרשמו בחודש, סך הכל

### Campaigns — ניהול קמפיינים

- [x] **CAMP-01**: מיכל יכולה ליצור קמפיין עם שם, תאריך אירוע, שעה, ותיאור
- [x] **CAMP-02**: לכל קמפיין ניתן להגדיר עד 4 הודעות עם תוכן + מתי לשלוח (שבוע לפני / יום לפני / בוקר האירוע / חצי שעה לפני)
- [x] **CAMP-03**: בעת יצירת קמפיין המערכת מחשבת אוטומטית את ה-send_at המדויק (UTC) לכל הודעה
- [x] **CAMP-04**: מיכל יכולה לראות רשימת כל הקמפיינים עם סטטוס (עתידי / פעיל / הסתיים)
- [x] **CAMP-05**: מיכל יכולה לראות כמה נרשמות יש לכל קמפיין
- [x] **CAMP-06**: מיכל יכולה לשנות את זמן השליחה של הודעה ממתינה (טרם נשלחה) — המערכת מחשבת מחדש את ה-send_at ומעדכנת ב-Airtable

### Messaging — שליחת הודעות

- [x] **MSG-01**: Bree scheduler מפעיל כל דקה בדיקה לשליחות ממתינות ושולח דרך GREEN API
- [x] **MSG-02**: מנגנון idempotency — הודעה עם סטטוס pending→sending→sent/failed מונע שליחה כפולה
- [x] **MSG-03**: מספרי טלפון מנורמלים אוטומטית לפורמט `972XXXXXXXXXX@c.us` לפני שליחה
- [x] **MSG-04**: מיכל יכולה לשלוח broadcast — הודעה חד-פעמית לכל הנרשמות לקמפיין

### Monitoring — מעקב

- [ ] **MON-01**: מיכל יכולה לראות לוג שליחות — כל הודעה שנשלחה/נכשלה עם timestamp
- [ ] **MON-02**: מיכל יכולה לראות מי לא קיבלה הודעה (נכשלה) לכל קמפיין
- [ ] **MON-03**: סטטוס חיבור GREEN API מוצג בדאשבורד (health check לפני כל batch)

## v2 Requirements

### Contacts

- **CONT-V2-01**: יבוא CSV ידני מרב מסר (הוספת קבוצה גדולה בבת אחת)
- **CONT-V2-02**: הודעת "ברוכה הבאה" אוטומטית לנרשמת חדשה
- **CONT-V2-03**: פרסונליזציה בסיסית — שם הלקוחה בהודעה (`{{שם}}`)

### Campaigns

- **CAMP-V2-01**: עריכת תאריך קמפיין קיים (עם חישוב מחדש של כל הזמנים)
- **CAMP-V2-02**: שכפול קמפיין קיים לאירוע חדש

### Monitoring

- **MON-V2-01**: סטטוס נקרא/התקבל מ-GREEN API webhooks (נוכחית רק sent/failed)
- **MON-V2-02**: גרף צמיחה חודשי

## Out of Scope

| Feature | Reason |
|---------|--------|
| הודעות מותאמות אישית לכל לקוחה (v1) | כולן מקבלות אותו תוכן — לא מורכב v1 |
| שיחות / inbox דו-כיווני | מוצר שונה לחלוטין |
| ניהול תשלומים | לא חלק מהמשפך |
| אפליקציית מובייל | Web responsive מספיק |
| ניהול רשימות ברב מסר | רק webhook קבלה, לא ניהול |
| Vercel deployment | חייב persistent process ל-Bree — Railway בלבד |
| Google Sheets / MAKE.com שמירת נתונים | Airtable מחליף — MAKE.com רק שולח webhook |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UX-01 | Phase 2 | Complete |
| UX-02 | Phase 3 | Complete |
| UX-03 | Phase 1 | Complete |
| UX-04 | Phase 5 | Pending |
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 2 | Complete |
| INFRA-05 | Phase 4 | Complete |
| CONT-01 | Phase 2 | Complete |
| CONT-02 | Phase 2 | Complete |
| CONT-03 | Phase 2 | Complete |
| CAMP-01 | Phase 3 | Complete |
| CAMP-02 | Phase 3 | Complete |
| CAMP-03 | Phase 3 | Complete |
| CAMP-04 | Phase 3 | Complete |
| CAMP-05 | Phase 3 | Complete |
| CAMP-06 | Phase 3 | Complete |
| MSG-01 | Phase 4 | Complete |
| MSG-02 | Phase 4 | Complete |
| MSG-03 | Phase 4 | Complete |
| MSG-04 | Phase 4 | Complete |
| MON-01 | Phase 5 | Pending |
| MON-02 | Phase 5 | Pending |
| MON-03 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 — traceability mapped by gsd-roadmapper*
