# Micahl CRM — Project Instructions

## Commands

```bash
npm run dev          # Dev server on port 3001
npm test             # Jest tests
npm run build        # Next.js build
npm run build:scheduler  # Build Bree scheduler (TypeScript → dist/)
npm run scheduler    # Run scheduler (requires build first)
```

## Stack

- **Next.js 15** (App Router, Server Components, Server Actions)
- **Airtable** as database — all access through `src/lib/airtable/` service layer only, never direct API calls
- **Bree** scheduler (runs in `dist/`) for sending WhatsApp messages
- **GREEN API** for WhatsApp
- **Hebrew RTL UI** — all user-facing text is Hebrew, layout is RTL

## Routes

| Route | Description |
|-------|-------------|
| `/` | Dashboard |
| `/anshei-kesher` | Contacts (אנשי קשר) |
| `/kampanim` | Campaigns |
| `/hagdarot` | Settings |

## Airtable Field Rules — CRITICAL

### ScheduledMessages table — two date/time systems:

| Field | Type | Value | Purpose |
|-------|------|-------|---------|
| `תאריך שליחה` | Date | YYYY-MM-DD (Israel local) | Display only |
| `שעת שליחה` | Text | HH:MM (Israel local) | Display only |
| `שליחה בשעה` | DateTime | ISO8601 UTC | **Scheduler uses this to trigger sends** |

**Rule: Every write to ScheduledMessages MUST populate `שליחה בשעה` with UTC.**
The Bree scheduler queries `IS_BEFORE({שליחה בשעה}, NOW())` — if this field is null, the message will never be sent.

Use `israelDateTimeToUTC(send_date, send_time)` from `src/lib/airtable/timezone.ts` to compute the UTC value before writing.

This applies to: `upsertScheduledMessages`, `createScheduledMessage`, `updateScheduledMessage`, and any future write to this table.

### Phone numbers

Always normalized as `972XXXXXXXXX` (no `+`, no leading `0`).
Use `normalizePhone()` from `src/lib/airtable/phone.ts`.

## Architecture Rules

- **Server Components** fetch data, **Server Actions** write data — no API routes for mutations
- **Service layer only** — UI components never import `airtable` directly, always go through `src/lib/airtable/*.ts`
- **Timezone utility** — all `send_at` calculations go through `src/lib/airtable/timezone.ts`, never compute UTC manually elsewhere
