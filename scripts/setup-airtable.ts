/**
 * setup-airtable.ts
 *
 * Creates all 5 Airtable tables for the Michal CRM system.
 * Uses the Airtable Meta API to define tables and fields.
 *
 * Idempotent: existing tables are detected and skipped — safe to run multiple times.
 *
 * Usage: npm run setup:airtable
 * Requires: AIRTABLE_API_TOKEN and AIRTABLE_BASE_ID in .env.local
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const API_TOKEN = process.env.AIRTABLE_API_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!API_TOKEN || !BASE_ID) {
  console.error(
    'Error: AIRTABLE_API_TOKEN and AIRTABLE_BASE_ID must be set in .env.local'
  );
  process.exit(1);
}

const BASE_URL = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`;

const headers: Record<string, string> = {
  Authorization: `Bearer ${API_TOKEN}`,
  'Content-Type': 'application/json',
};

// ─── Field type definitions ────────────────────────────────────────────────

type AirtableFieldType =
  | 'singleLineText'
  | 'multilineText'
  | 'phoneNumber'
  | 'date'
  | 'dateTime'
  | 'singleSelect'
  | 'createdTime';

interface SingleSelectOption {
  name: string;
}

interface AirtableField {
  name: string;
  type: AirtableFieldType;
  options?: {
    choices?: SingleSelectOption[];
    dateFormat?: { name: string };
    timeFormat?: { name: string };
    timeZone?: string;
  };
}

interface TableDefinition {
  name: string;
  fields: AirtableField[];
}

// ─── Table Definitions ────────────────────────────────────────────────────

const TABLES: TableDefinition[] = [
  {
    name: 'Campaigns',
    fields: [
      {
        name: 'שם קמפיין',
        type: 'singleLineText',
      },
      {
        name: 'תאריך אירוע',
        type: 'dateTime',
        options: {
          dateFormat: { name: 'iso' },
          timeFormat: { name: '24hour' },
          timeZone: 'utc',
        },
      },
      {
        name: 'תיאור',
        type: 'multilineText',
      },
      {
        name: 'סטטוס',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'עתידי' },
            { name: 'פעיל' },
            { name: 'הסתיים' },
          ],
        },
      },
    ],
  },
  {
    name: 'Contacts',
    fields: [
      {
        name: 'שם מלא',
        type: 'singleLineText',
      },
      {
        name: 'טלפון',
        type: 'phoneNumber',
      },
      {
        name: 'תאריך הצטרפות',
        type: 'date',
        options: {
          dateFormat: { name: 'iso' },
        },
      },
      {
        name: 'הערות',
        type: 'multilineText',
      },
    ],
  },
  {
    name: 'CampaignEnrollments',
    fields: [
      {
        name: 'מקור',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'ידני' },
            { name: 'Webhook' },
          ],
        },
      },
      {
        name: 'תאריך רישום',
        type: 'dateTime',
        options: {
          dateFormat: { name: 'iso' },
          timeFormat: { name: '24hour' },
          timeZone: 'utc',
        },
      },
    ],
  },
  {
    name: 'ScheduledMessages',
    fields: [
      {
        name: 'תוכן ההודעה',
        type: 'multilineText',
      },
      {
        name: 'שליחה בשעה',
        type: 'dateTime',
        options: {
          dateFormat: { name: 'iso' },
          timeFormat: { name: '24hour' },
          timeZone: 'utc',
        },
      },
      {
        name: 'תזמון',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'שבוע לפני' },
            { name: 'יום לפני' },
            { name: 'בוקר האירוע' },
            { name: 'חצי שעה לפני' },
          ],
        },
      },
      {
        name: 'סטטוס',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'ממתינה' },
            { name: 'בשליחה' },
            { name: 'נשלחה' },
            { name: 'נכשלה' },
          ],
        },
      },
      {
        name: 'נשלח בשעה',
        type: 'dateTime',
        options: {
          dateFormat: { name: 'iso' },
          timeFormat: { name: '24hour' },
          timeZone: 'utc',
        },
      },
    ],
  },
  {
    name: 'MessageLog',
    fields: [
      {
        name: 'סטטוס',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'נשלחה' },
            { name: 'נכשלה' },
          ],
        },
      },
      {
        name: 'תגובת GREEN API',
        type: 'multilineText',
      },
      {
        name: 'הודעת שגיאה',
        type: 'multilineText',
      },
    ],
  },
];

// ─── Notes on linked fields ───────────────────────────────────────────────
//
// The Airtable Meta API requires that linked record fields reference an existing
// table ID (not table name). Because table IDs are only known after creation,
// linked fields (campaign_id, contact_id, scheduled_message_id) cannot be
// created in the initial POST. After running this script, manually add the
// following linked record fields in the Airtable UI:
//
// CampaignEnrollments:
//   - קמפיין    → Link to Campaigns
//   - איש קשר  → Link to Contacts
//
// ScheduledMessages:
//   - קמפיין    → Link to Campaigns
//   - איש קשר  → Link to Contacts
//
// MessageLog:
//   - הודעה מתוזמנת → Link to ScheduledMessages
//   - איש קשר       → Link to Contacts
//   - קמפיין        → Link to Campaigns
//
// See docs/airtable-schema.md for the full field reference.

// ─── Helpers ──────────────────────────────────────────────────────────────

async function getExistingTableNames(): Promise<Set<string>> {
  const response = await fetch(BASE_URL, { headers });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to list tables (${response.status}): ${body}`
    );
  }

  const data = (await response.json()) as { tables: Array<{ name: string }> };
  return new Set(data.tables.map((t) => t.name));
}

async function createTable(table: TableDefinition): Promise<void> {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: table.name,
      fields: table.fields,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to create table "${table.name}" (${response.status}): ${body}`
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('Michal CRM — Airtable Schema Setup');
  console.log(`Base ID: ${BASE_ID}`);
  console.log('');

  let existingTables: Set<string>;
  try {
    existingTables = await getExistingTableNames();
  } catch (error) {
    console.error('Error fetching existing tables:', error);
    process.exit(1);
  }

  for (const table of TABLES) {
    if (existingTables.has(table.name)) {
      console.log(`Table already exists: ${table.name} — skipping`);
      continue;
    }

    console.log(`Creating table: ${table.name}`);
    try {
      await createTable(table);
      console.log(`  Created: ${table.name} (${table.fields.length} fields)`);
    } catch (error) {
      console.error(`  Error creating ${table.name}:`, error);
      process.exit(1);
    }
  }

  console.log('');
  console.log('Schema setup complete.');
  console.log('');
  console.log(
    'NEXT STEP: Add linked record fields manually in the Airtable UI.'
  );
  console.log('See docs/airtable-schema.md — "Linked Record Fields" section.');
}

main();
