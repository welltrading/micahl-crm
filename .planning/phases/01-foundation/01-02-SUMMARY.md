---
phase: 01-foundation
plan: 02
subsystem: airtable-schema
tags: [airtable, schema, seed-data, scripts]
dependency_graph:
  requires: []
  provides: [airtable-schema, seed-data, schema-docs]
  affects: [01-03-service-layer]
tech_stack:
  added: [dotenv, airtable-sdk, tsconfig.scripts.json]
  patterns: [meta-api-idempotent-setup, separate-script-tsconfig]
key_files:
  created:
    - scripts/setup-airtable.ts
    - scripts/seed-airtable.ts
    - docs/airtable-schema.md
    - tsconfig.scripts.json
  modified:
    - package.json
decisions:
  - English table names / Hebrew field display names — English names are stable in API URLs; Hebrew only at field level
  - Linked record fields documented as manual UI step — Airtable Meta API requires existing table IDs for linked fields, which are only known post-creation
  - tsconfig.scripts.json with moduleResolution:node — Airtable SDK types use CommonJS imports incompatible with bundler moduleResolution
metrics:
  duration: ~15 min
  completed: 2026-03-18
  tasks_completed: 2
  files_created: 4
  files_modified: 1
---

# Phase 01 Plan 02: Airtable Schema Setup Summary

**One-liner:** Airtable 5-table schema with Hebrew field names, idempotent Meta API setup script, seed data script, and complete field reference documentation.

---

## What Was Built

### scripts/setup-airtable.ts

Uses the Airtable Meta API (`/v0/meta/bases/{baseId}/tables`) to create all 5 tables. Key behaviors:

- **Idempotent:** GETs existing table names first; skips any table that already exists
- **No hardcoded credentials:** reads `AIRTABLE_API_TOKEN` and `AIRTABLE_BASE_ID` from `.env.local`
- **Typed field definitions:** `AirtableField` and `TableDefinition` interfaces — no `any`
- **Clear output:** logs "Creating table: X" or "Table already exists: X — skipping"
- **Linked fields documented but not created:** Airtable Meta API requires table IDs (only known after creation) to create linked record fields — these are documented as a manual UI step

### scripts/seed-airtable.ts

Uses the Airtable Node SDK (not Meta API) to insert representative development data:

- 2 Campaigns: yoga (future, 2 weeks away) and winter meditation (ended, 90 days ago)
- 3 Contacts: רחל כהן, מרים לוי, דינה אברהם with normalized phone numbers
- 3 CampaignEnrollments: all three contacts enrolled in the yoga campaign
- 2 ScheduledMessages for רחל כהן: one sent (week-before slot), one pending (day-before slot)
- 1 MessageLog record for the sent message (GREEN API response included)

Inserts in dependency order: Campaigns → Contacts → Enrollments → Messages → Log.
Captures Airtable record IDs from each stage to link subsequent records correctly.

### docs/airtable-schema.md

Complete human-readable field reference with:
- All 5 tables: API field names, Hebrew display names, Airtable types, notes
- Single select option values with code values and Hebrew display values
- Relationships diagram (text-based)
- Linked record fields: manual setup instructions post-script
- Phone number normalization format (`972XXXXXXXXXX`)
- Environment variable table

### tsconfig.scripts.json (deviation — Rule 3 fix)

Created to resolve TypeScript compilation incompatibility between the Airtable SDK's CommonJS type declarations and the project's `moduleResolution: bundler` tsconfig. The scripts tsconfig extends the base but overrides to `moduleResolution: node` and `esModuleInterop: true`. Both scripts compile cleanly under this config.

---

## Field API Names (used by service layer in Plan 03)

### Campaigns
| API field name  | Hebrew display  |
|-----------------|-----------------|
| שם קמפיין       | campaign_name   |
| תאריך אירוע     | event_date      |
| תיאור           | description     |
| סטטוס           | status          |
| נוצר בתאריך     | created_at      |

> Note: The API field name IS the Hebrew display name for Airtable — the service layer references records by their Airtable field names (Hebrew strings). Plan 03 should use the Hebrew field names directly when constructing Airtable queries.

### Contacts
`שם מלא`, `טלפון`, `תאריך הצטרפות`, `הערות`, `נוצר בתאריך`

### CampaignEnrollments
`קמפיין` (linked), `איש קשר` (linked), `תאריך רישום`, `מקור`

### ScheduledMessages
`קמפיין` (linked), `איש קשר` (linked), `תוכן ההודעה`, `שליחה בשעה`, `תזמון`, `סטטוס`, `נשלח בשעה`

### MessageLog
`הודעה מתוזמנת` (linked), `איש קשר` (linked), `קמפיין` (linked), `סטטוס`, `תגובת GREEN API`, `הודעת שגיאה`, `תאריך רישום`

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] tsconfig incompatibility with Airtable SDK types**
- **Found during:** Task 2 verification (tsc --noEmit)
- **Issue:** Project tsconfig uses `moduleResolution: bundler` (Next.js default). Airtable SDK's `.d.ts` files use CommonJS-style imports incompatible with bundler resolution. This caused 19 TS1259 errors — none in our code, all in node_modules.
- **Fix:** Created `tsconfig.scripts.json` extending base tsconfig but overriding to `moduleResolution: node` + `esModuleInterop: true`. Updated npm scripts to pass `--project tsconfig.scripts.json` to ts-node.
- **Files modified:** `tsconfig.scripts.json` (new), `package.json`
- **Commit:** 26ab9a5

---

## Seed Data Verification

Seed data was NOT run against a real Airtable base — verified by TypeScript compilation only. Manual verification required when credentials are available:

```bash
# 1. Add to .env.local:
#    AIRTABLE_API_TOKEN=pat...
#    AIRTABLE_BASE_ID=app...

# 2. Create tables:
npm run setup:airtable

# 3. Add linked record fields manually in Airtable UI (see docs/airtable-schema.md)

# 4. Insert seed data:
npm run seed:airtable
```

---

## Commits

| Task | Commit  | Description                                              |
|------|---------|----------------------------------------------------------|
| 1    | 53daedb | feat(01-02): create Airtable schema setup script and documentation |
| 2    | 26ab9a5 | feat(01-02): create Airtable seed data script and script tsconfig |
