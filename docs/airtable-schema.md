# Airtable Schema Reference — Michal CRM

> **Table names are English** (Airtable API stability — table names appear in URLs).
> **Field display names are Hebrew** (Michal's UX — what she sees in Airtable).
> **Field API names are the code keys** used in the service layer (src/lib/airtable/).

> AIRTABLE_BASE_ID is read from `.env.local`. Never hardcode the base ID.

---

## Relationships

```
Campaigns ──< CampaignEnrollments >── Contacts
                                          │
Campaigns ──< ScheduledMessages >─────── Contacts
                                          │
ScheduledMessages ──< MessageLog >─────── Contacts
                           │
                       Campaigns
```

- **CampaignEnrollments** joins Campaigns ↔ Contacts (many-to-many)
- **ScheduledMessages** links one message send to a Campaign + Contact pair
- **MessageLog** is the delivery audit trail for each ScheduledMessages record

---

## Table: Campaigns

Stores events/workshops that Michal runs.

| API Field Name   | Hebrew Display   | Airtable Type          | Notes                                       |
|------------------|------------------|------------------------|---------------------------------------------|
| `campaign_name`  | שם קמפיין        | Single line text       | Required. The event name.                   |
| `event_date`     | תאריך אירוע      | Date + time (UTC)      | ISO8601. Used to compute send times.        |
| `description`    | תיאור            | Long text              | Optional free text.                         |
| `status`         | סטטוס            | Single select          | Values: עתידי / פעיל / הסתיים              |
| `created_at`     | נוצר בתאריך      | Created time (auto)    | Set by Airtable on record creation.         |

**Single select option values:**

| Code value | Hebrew display |
|------------|----------------|
| `עתידי`    | עתידי          |
| `פעיל`     | פעיל           |
| `הסתיים`   | הסתיים         |

---

## Table: Contacts

All women who have registered for at least one campaign.

| API Field Name  | Hebrew Display      | Airtable Type       | Notes                                                  |
|-----------------|---------------------|---------------------|--------------------------------------------------------|
| `full_name`     | שם מלא              | Single line text    | Required.                                              |
| `phone`         | טלפון               | Phone               | Required. Stored normalized: `972XXXXXXXXXX` (no +).  |
| `joined_date`   | תאריך הצטרפות       | Date                | ISO date (no time). When she first registered.        |
| `notes`         | הערות               | Long text           | Optional internal notes.                              |
| `created_at`    | נוצר בתאריך         | Created time (auto) | Set by Airtable on record creation.                   |

---

## Table: CampaignEnrollments

Junction table — one record per (Contact, Campaign) pair.

| API Field Name  | Hebrew Display  | Airtable Type             | Notes                               |
|-----------------|-----------------|---------------------------|-------------------------------------|
| `campaign_id`   | קמפיין          | Link to Campaigns         | Required. Linked record field.      |
| `contact_id`    | איש קשר         | Link to Contacts          | Required. Linked record field.      |
| `enrolled_at`   | תאריך רישום     | Date + time (UTC)         | When the enrollment was created.    |
| `source`        | מקור            | Single select             | Values: ידני / Webhook              |

**Single select option values:**

| Code value | Hebrew display |
|------------|----------------|
| `ידני`     | ידני           |
| `Webhook`  | Webhook        |

---

## Table: ScheduledMessages

One record per (Campaign, Contact, timing-slot) combination. Created in bulk when
a campaign's message schedule is generated.

| API Field Name    | Hebrew Display    | Airtable Type         | Notes                                              |
|-------------------|-------------------|-----------------------|----------------------------------------------------|
| `campaign_id`     | קמפיין            | Link to Campaigns     | Required. Linked record field.                     |
| `contact_id`      | איש קשר           | Link to Contacts      | Required. Linked record field.                     |
| `message_content` | תוכן ההודעה       | Long text             | Required. The text to send via WhatsApp.           |
| `send_at`         | שליחה בשעה        | Date + time (UTC)     | Required. UTC timestamp for the Bree scheduler.   |
| `offset_label`    | תזמון             | Single select         | Which slot this message occupies.                  |
| `status`          | סטטוס             | Single select         | Current delivery status.                           |
| `sent_at`         | נשלח בשעה         | Date + time (UTC)     | Set by scheduler on confirmed delivery.            |

**offset_label option values:**

| Code value      | Hebrew display    | Meaning                          |
|-----------------|-------------------|----------------------------------|
| `week_before`   | שבוע לפני         | 7 days before event_date         |
| `day_before`    | יום לפני           | 24 hours before event_date       |
| `morning`       | בוקר האירוע       | Day-of at 08:00 local time       |
| `half_hour`     | חצי שעה לפני      | 30 minutes before event_date     |

**status option values:**

| Code value | Hebrew display | Meaning                                 |
|------------|----------------|-----------------------------------------|
| `pending`  | ממתינה         | Not yet attempted                       |
| `sending`  | בשליחה         | Scheduler is currently processing       |
| `sent`     | נשלחה          | GREEN API confirmed delivery            |
| `failed`   | נכשלה          | Delivery failed — see MessageLog        |

---

## Table: MessageLog

Delivery audit log — one record per send attempt.

| API Field Name           | Hebrew Display         | Airtable Type              | Notes                                              |
|--------------------------|------------------------|----------------------------|----------------------------------------------------|
| `scheduled_message_id`   | הודעה מתוזמנת          | Link to ScheduledMessages  | Required. Which message was attempted.             |
| `contact_id`             | איש קשר                | Link to Contacts           | Required. Denormalized for quick filtering.        |
| `campaign_id`            | קמפיין                 | Link to Campaigns          | Required. Denormalized for quick filtering.        |
| `status`                 | סטטוס                  | Single select              | Values: נשלחה / נכשלה                             |
| `green_api_response`     | תגובת GREEN API        | Long text                  | Raw JSON from GREEN API. For debugging.            |
| `error_message`          | הודעת שגיאה            | Long text                  | Human-readable Hebrew error description.           |
| `logged_at`              | תאריך רישום            | Created time (auto)        | Set by Airtable on record creation.                |

**status option values:**

| Code value | Hebrew display | Meaning              |
|------------|----------------|----------------------|
| `sent`     | נשלחה          | GREEN API confirmed  |
| `failed`   | נכשלה          | Delivery failure     |

---

## Linked Record Fields — Manual Setup Required

The Airtable Meta API requires existing table IDs to create linked record fields.
After running `npm run setup:airtable`, add these linked fields **manually in the Airtable UI**:

### CampaignEnrollments
- `קמפיין` (campaign_id) → Link to **Campaigns**
- `איש קשר` (contact_id) → Link to **Contacts**

### ScheduledMessages
- `קמפיין` (campaign_id) → Link to **Campaigns**
- `איש קשר` (contact_id) → Link to **Contacts**

### MessageLog
- `הודעה מתוזמנת` (scheduled_message_id) → Link to **ScheduledMessages**
- `איש קשר` (contact_id) → Link to **Contacts**
- `קמפיין` (campaign_id) → Link to **Campaigns**

---

## Environment Variables

| Variable             | Description                          | Example                    |
|----------------------|--------------------------------------|----------------------------|
| `AIRTABLE_API_TOKEN` | Personal Access Token (server-only)  | `pat...`                   |
| `AIRTABLE_BASE_ID`   | The Airtable base for all operations | `appXXXXXXXXXXXXXX`        |

These are read from `.env.local`. **Never hardcode either value.**
The Airtable token is server-side only — never expose it to the browser.

---

## Phone Number Format

All phone numbers stored as `972XXXXXXXXXX` (Israeli format, no `+` prefix, no spaces).
Normalization happens at intake (webhook handler / import handler).

Examples:
- Input: `050-123-4567` → Stored: `972501234567`
- Input: `+972521234568` → Stored: `972521234568`

---

*Schema version: 1.0 — Phase 01-foundation, Plan 02*
*Field API names are final — the service layer (Plan 03) binds to these names.*
