/**
 * seed-airtable.ts
 *
 * Inserts sample development data into the Airtable base.
 * Gives Michal a realistic preview of how the system looks before going live.
 *
 * DELETE ALL SEED RECORDS before the first production campaign.
 * Safe to re-run: creates new records each time (does not check for duplicates).
 *
 * Prerequisite: run `npm run setup:airtable` first.
 * Usage: npm run seed:airtable
 * Requires: AIRTABLE_API_TOKEN and AIRTABLE_BASE_ID in .env.local
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import Airtable from 'airtable';

const API_TOKEN = process.env.AIRTABLE_API_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!API_TOKEN || !BASE_ID) {
  console.error(
    'Error: AIRTABLE_API_TOKEN and AIRTABLE_BASE_ID must be set in .env.local'
  );
  process.exit(1);
}

Airtable.configure({ apiKey: API_TOKEN });
const base = new Airtable().base(BASE_ID);

// ─── Date helpers ─────────────────────────────────────────────────────────

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function daysAgo(days: number): string {
  return daysFromNow(-days);
}

function dateOnly(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

// ─── Seed logic ───────────────────────────────────────────────────────────

async function seedCampaigns(): Promise<{ yogaId: string; meditationId: string }> {
  console.log('\nSeeding: Campaigns');

  const records = await base('Campaigns').create([
    {
      fields: {
        'שם קמפיין': 'קמפיין סדנת יוגה',
        'תאריך אירוע': daysFromNow(14),
        'תיאור': 'סדנת יוגה לנשים — 2 שעות של תרגול ונשימה',
        'סטטוס': 'עתידי',
      },
    },
    {
      fields: {
        'שם קמפיין': 'קמפיין מדיטציה חורף',
        'תאריך אירוע': daysAgo(90),
        'תיאור': 'סדנת מדיטציה חורפית — הושלמה',
        'סטטוס': 'הסתיים',
      },
    },
  ]);

  const yogaId = records[0].id;
  const meditationId = records[1].id;

  console.log(`  Seeded: Campaigns — קמפיין סדנת יוגה (${yogaId})`);
  console.log(`  Seeded: Campaigns — קמפיין מדיטציה חורף (${meditationId})`);

  return { yogaId, meditationId };
}

async function seedContacts(): Promise<{
  rachelId: string;
  miriamId: string;
  dinaId: string;
}> {
  console.log('\nSeeding: Contacts');

  const records = await base('Contacts').create([
    {
      fields: {
        'שם מלא': 'רחל כהן',
        'טלפון': '972501234567',
        'תאריך הצטרפות': dateOnly(-30),
        'הערות': 'לקוחה ותיקה, מגיעה לרוב הסדנאות',
      },
    },
    {
      fields: {
        'שם מלא': 'מרים לוי',
        'טלפון': '972521234568',
        'תאריך הצטרפות': dateOnly(-60),
        'הערות': '',
      },
    },
    {
      fields: {
        'שם מלא': 'דינה אברהם',
        'טלפון': '972541234569',
        'תאריך הצטרפות': dateOnly(-7),
        'הערות': 'הצטרפה לאחרונה מדף הנחיתה',
      },
    },
  ]);

  const rachelId = records[0].id;
  const miriamId = records[1].id;
  const dinaId = records[2].id;

  console.log(`  Seeded: Contacts — רחל כהן (${rachelId})`);
  console.log(`  Seeded: Contacts — מרים לוי (${miriamId})`);
  console.log(`  Seeded: Contacts — דינה אברהם (${dinaId})`);

  return { rachelId, miriamId, dinaId };
}

async function seedEnrollments(
  yogaId: string,
  rachelId: string,
  miriamId: string,
  dinaId: string
): Promise<void> {
  console.log('\nSeeding: CampaignEnrollments');

  const records = await base('CampaignEnrollments').create([
    {
      fields: {
        'קמפיין': [yogaId],
        'איש קשר': [rachelId],
        'תאריך רישום': daysAgo(20),
        'מקור': 'ידני',
      },
    },
    {
      fields: {
        'קמפיין': [yogaId],
        'איש קשר': [miriamId],
        'תאריך רישום': daysAgo(18),
        'מקור': 'ידני',
      },
    },
    {
      fields: {
        'קמפיין': [yogaId],
        'איש קשר': [dinaId],
        'תאריך רישום': daysAgo(5),
        'מקור': 'Webhook',
      },
    },
  ]);

  console.log(`  Seeded: CampaignEnrollments — רחל כהן ← סדנת יוגה (${records[0].id})`);
  console.log(`  Seeded: CampaignEnrollments — מרים לוי ← סדנת יוגה (${records[1].id})`);
  console.log(`  Seeded: CampaignEnrollments — דינה אברהם ← סדנת יוגה (${records[2].id})`);
}

async function seedScheduledMessages(
  yogaId: string,
  rachelId: string
): Promise<string> {
  console.log('\nSeeding: ScheduledMessages');

  const records = await base('ScheduledMessages').create([
    {
      fields: {
        'קמפיין': [yogaId],
        'איש קשר': [rachelId],
        'תוכן ההודעה': 'שלום {{שם}}, תזכורת לסדנה בעוד שבוע!',
        'שליחה בשעה': daysAgo(7),
        'תזמון': 'שבוע לפני',
        'סטטוס': 'נשלחה',
        'נשלח בשעה': daysAgo(7),
      },
    },
    {
      fields: {
        'קמפיין': [yogaId],
        'איש קשר': [rachelId],
        'תוכן ההודעה': 'סדנת היוגה מחר — מחכים לך!',
        'שליחה בשעה': daysFromNow(13),
        'תזמון': 'יום לפני',
        'סטטוס': 'ממתינה',
      },
    },
  ]);

  const sentMessageId = records[0].id;

  console.log(`  Seeded: ScheduledMessages — שבוע לפני / נשלחה (${sentMessageId})`);
  console.log(`  Seeded: ScheduledMessages — יום לפני / ממתינה (${records[1].id})`);

  return sentMessageId;
}

async function seedMessageLog(
  sentMessageId: string,
  rachelId: string,
  yogaId: string
): Promise<void> {
  console.log('\nSeeding: MessageLog');

  const record = await base('MessageLog').create({
    'הודעה מתוזמנת': [sentMessageId],
    'איש קשר': [rachelId],
    'קמפיין': [yogaId],
    'סטטוס': 'נשלחה',
    'תגובת GREEN API': JSON.stringify({ status: 'ok', id: '1234567890' }),
    'הודעת שגיאה': '',
  });

  console.log(`  Seeded: MessageLog — נשלחה (${record.id})`);
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('Michal CRM — Seed Data');
  console.log(`Base ID: ${BASE_ID}`);
  console.log('');
  console.log(
    'WARNING: This script inserts NEW records each time it runs.'
  );
  console.log(
    'DELETE all seed data before going live with real campaigns.'
  );

  try {
    const { yogaId } = await seedCampaigns();
    const { rachelId, miriamId, dinaId } = await seedContacts();
    await seedEnrollments(yogaId, rachelId, miriamId, dinaId);
    const sentMessageId = await seedScheduledMessages(yogaId, rachelId);
    await seedMessageLog(sentMessageId, rachelId, yogaId);

    console.log('\nSeed complete. Open Airtable to verify the data.');
  } catch (error) {
    console.error('\nSeed failed:', error);
    process.exit(1);
  }
}

main();
