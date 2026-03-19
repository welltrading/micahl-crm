# Roadmap: מיכל CRM — WhatsApp Campaign Manager

## Overview

Six phases that build from infrastructure upward, each delivering a verifiable capability. The order is dictated by hard dependencies: data layer before UI, contacts before campaigns, campaigns before scheduling, scheduling before monitoring. Every critical pitfall (duplicate sends, timezone bugs, phone format corruption) is addressed in the earliest phase that touches the relevant data — none are deferred. Michal's self-service UX goal is woven into every phase that builds a UI surface, not treated as polish at the end.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Next.js project on Railway, Airtable schema, service layer, Hebrew RTL layout (completed 2026-03-18)
- [x] **Phase 2: Contact CRM** - Contact list UI, add contact manually, webhook intake from MAKE.com, phone normalization (completed 2026-03-18)
- [ ] **Phase 3: Campaign Management** - Campaign creation, event-relative message scheduling, timezone-correct UTC storage
- [x] **Phase 4: Scheduler Engine** - Bree scheduler, GREEN API integration, idempotent send loop, broadcast capability (completed 2026-03-18)
- [ ] **Phase 5: Monitoring + Error UX** - Message status board, per-contact delivery view, error explanations, GREEN API health indicator
- [ ] **Phase 6: Stats + Polish** - Monthly growth stats, reschedule pending message, mobile RTL pass

## Phase Details

### Phase 1: Foundation
**Goal**: מיכל יכולה לגשת לדאשבורד — Next.js רץ על Railway, Airtable schema קיים ומלא, כל גישה ל-Airtable עוברת דרך service layer בלבד
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, UX-03
**Success Criteria** (what must be TRUE):
  1. דאשבורד נטען ב-Railway עם layout בעברית RTL — כל טקסט, כפתורים ופאנלים מיושרים לימין
  2. Airtable base קיים עם 5 טבלאות (Campaigns, Contacts, CampaignEnrollments, ScheduledMessages, MessageLog) — ניתן לצפות ברשומות ב-Airtable ישירות
  3. כל endpoint שמנסה לקרוא Airtable מהצד הלקוח נחסם — הטוקן לא נחשף ב-Network tab של הדפדפן
  4. דף הגדרות מכיל הנחיות step-by-step לחיבור GREEN API ו-MAKE.com webhook — מיכל יכולה להבין ולבצע ללא עזרה טכנית
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Next.js bootstrap, Railway config, Bree process declaration
- [ ] 01-02-PLAN.md — Airtable schema (5 tables), setup script, seed data
- [ ] 01-03-PLAN.md — Server-only service layer, Hebrew RTL layout, Settings page

### Phase 2: Contact CRM
**Goal**: מיכל יכולה לראות, לחפש ולהוסיף אנשי קשר — והמערכת מקבלת נרשמות חדשות מ-MAKE.com אוטומטית
**Depends on**: Phase 1
**Requirements**: CONT-01, CONT-02, CONT-03, UX-01, INFRA-04
**Success Criteria** (what must be TRUE):
  1. מיכל יכולה לראות רשימת כל אנשי הקשר עם שם, טלפון, תאריך הצטרפות וקמפיין — ממשק ויזואלי, ללא פתיחת Airtable
  2. מיכל יכולה ללחוץ על איש קשר ולראות אילו הודעות קיבל לפי קמפיין
  3. MAKE.com שולח webhook עם פרטי נרשמת חדשה — הרשומה מופיעה ב-CRM תוך שניות, מספר הטלפון מנורמל אוטומטית לפורמט 972XXXXXXXXXX
  4. מיכל יכולה לראות סטטיסטיקה — כמה נרשמו החודש, סך הכל בסיס הנתונים
  5. כל פעולה (הוספת איש קשר, רענון רשימה) מתבצעת מהממשק בלבד — ללא עריכה ישירה ב-Airtable
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Phone utility (normalizePhone/formatPhoneDisplay) + Airtable service extensions (createContact, getContactEnrollments, getContactMessages) — TDD
- [ ] 02-02-PLAN.md — MAKE.com webhook route handler with auth, validation, phone normalization
- [ ] 02-03-PLAN.md — Contacts page: RTL table, stat cards, search, add-contact modal + Server Action
- [ ] 02-04-PLAN.md — Contact detail slide panel with on-demand campaign-grouped message history

### Phase 3: Campaign Management
**Goal**: מיכל יכולה ליצור קמפיין לאירוע, להגדיר הודעות לפי זמן יחסי לאירוע, ולראות את ה-send_at המחושב לכל הודעה — בלי לכתוב תאריכים ידנית
**Depends on**: Phase 2
**Requirements**: CAMP-01, CAMP-02, CAMP-03, CAMP-04, CAMP-05, CAMP-06, UX-02
**Success Criteria** (what must be TRUE):
  1. מיכל יוצרת קמפיין עם שם + תאריך + שעה — הטופס בעברית, בחירה ויזואלית של תאריך ושעה (לא כתיבה ידנית)
  2. מיכל בוחרת זמן שליחה מרשימה ("שבוע לפני", "יום לפני", "בוקר האירוע", "חצי שעה לפני") — המערכת מחשבת ומציגה את התאריך והשעה המדויקים בישראל
  3. לאחר שמירת הקמפיין, ב-Airtable מופיעות 4 רשומות ScheduledMessages עם send_at ב-UTC — מדויקות גם אם האירוע בחציית שינוי שעון
  4. מיכל יכולה לשנות זמן שליחה של הודעה ממתינה — send_at מתעדכן מיד ב-Airtable
  5. מסך קמפיינים מציג רשימה עם סטטוס (עתידי / פעיל / הסתיים) וכמות נרשמות לכל קמפיין
**Plans**: 4 plans

Plans:
- [ ] 03-01-PLAN.md — Test scaffolds (timezone, scheduled-messages, campaigns extensions) + timezone.ts TDD
- [ ] 03-02-PLAN.md — Airtable service layer: campaigns.ts extensions + scheduled-messages.ts TDD
- [ ] 03-03-PLAN.md — Campaigns list page: card grid, create modal, Server Action
- [ ] 03-04-PLAN.md — CampaignSheet: 4 message slots, live send preview, save/edit flow

### Phase 4: Scheduler Engine
**Goal**: הודעות מתוזמנות נשלחות בזמן דרך GREEN API — הלולאה אידמפוטנטית, אי-אפשר לשלוח הודעה פעמיים, ומיכל יכולה לשלוח broadcast ידני
**Depends on**: Phase 3
**Requirements**: MSG-01, MSG-02, MSG-03, MSG-04, INFRA-04, INFRA-05
**Success Criteria** (what must be TRUE):
  1. כל דקה Bree בודק הודעות ממתינות ושולח דרך GREEN API — הודעות מסומנות sent ב-Airtable לאחר שליחה מוצלחת
  2. אם הבדיקה רצה פעמיים בו-זמנית, ההודעה נשלחת פעם אחת בלבד — סטטוס sending מונע כפילות
  3. סטטוס חיבור GREEN API מוצג בדאשבורד (מחובר / מנותק) — מיכל רואה בעיה לפני שהיא מגלה שהודעות לא נשלחו
  4. מיכל לוחצת "שלח broadcast" לקמפיין, מאשרת, וכל הנרשמות מקבלות את ההודעה תוך דקות
  5. מספרי טלפון בפורמטים שונים (050-..., +972..., 972...) נשלחים בהצלחה — נורמליזציה שקופה
**Plans**: 4 plans

Plans:
- [ ] 04-01-PLAN.md — GREEN API client + scheduler service layer + test scaffolds (Wave 1)
- [ ] 04-02-PLAN.md — Bree send-messages job + tsconfig.scheduler.json + railway.toml update (Wave 2)
- [ ] 04-03-PLAN.md — broadcastAction Server Action + CampaignSheet broadcast UI (Wave 2)
- [ ] 04-04-PLAN.md — GREEN API status badge on Settings page + human verify checkpoint (Wave 3)

### Phase 5: Monitoring + Error UX
**Goal**: מיכל יכולה לעקוב אחרי מצב כל הודעה, לדעת מי לא קיבל, ולהבין שגיאות בשפה פשוטה — לא קודי שגיאה
**Depends on**: Phase 4
**Requirements**: MON-01, MON-02, MON-03, UX-04
**Success Criteria** (what must be TRUE):
  1. מסך סטטוס לכל קמפיין מציג כל הודעה עם סטטוס (ממתינה / נשלחה / נכשלה) ו-timestamp
  2. מיכל יכולה לראות ברשימה מי לא קיבל הודעה לקמפיין ספציפי — שם + טלפון + סיבת כשל
  3. כשGREEN API מנותקת, הדאשבורד מציג הסבר בעברית פשוטה עם הוראת פעולה ("GREEN API מנותקת — נא להתחבר מחדש ב-Settings")
  4. כשהודעה נכשלת, הסיבה מוצגת בעברית ידידותית — לא "error code 403" אלא "מספר הטלפון לא קיים בוואצאפ"
**Plans**: 3 plans

Plans:
- [ ] 05-01-PLAN.md — Airtable read layer: getMessageLogByCampaign, mapErrorToHebrew, getCampaignLogAction + tests (Wave 1)
- [ ] 05-02-PLAN.md — GREEN API disconnect banner on campaigns page (Wave 1, parallel)
- [ ] 05-03-PLAN.md — CampaignSheet "יומן שליחות" tab: lazy load, table, failures toggle (Wave 2)

### Phase 6: Stats + Polish
**Goal**: מיכל רואה צמיחת קהל לאורך זמן, הממשק עובד היטב במובייל, ועריכת זמן שליחה ממתינה עובדת חלק
**Depends on**: Phase 5
**Requirements**: CONT-03
**Success Criteria** (what must be TRUE):
  1. מסך CRM מציג גרף או טבלה של הצטרפויות לפי חודש — מיכל רואה מגמה
  2. כל מסך בדאשבורד עובד ב-mobile responsive — טקסט RTל קריא, כפתורים נגישים, ללא גלילה אופקית
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete   | 2026-03-18 |
| 2. Contact CRM | 4/4 | Complete   | 2026-03-18 |
| 3. Campaign Management | 3/4 | In Progress|  |
| 4. Scheduler Engine | 4/4 | Complete   | 2026-03-18 |
| 5. Monitoring + Error UX | 1/3 | In Progress|  |
| 6. Stats + Polish | 0/TBD | Not started | - |
