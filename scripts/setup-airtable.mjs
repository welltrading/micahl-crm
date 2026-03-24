const TOKEN = process.env.AIRTABLE_API_TOKEN || '';
const BASE_ID = process.env.AIRTABLE_BASE_ID || '';

async function createTable(name, fields) {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, fields }),
  });
  const json = await res.json();
  if (json.id) {
    console.log(`✓ ${name}: ${json.id}`);
    return json.id;
  } else {
    console.error(`✗ ${name}:`, JSON.stringify(json.error));
    return null;
  }
}

// Step 3: CampaignEnrollments (linked records added after tables exist)
await createTable('CampaignEnrollments', [
  { name: 'שם', type: 'singleLineText' },
  { name: 'מקור', type: 'singleSelect', options: { choices: [{ name: 'ידני' }, { name: 'Webhook' }] } },
  { name: 'תאריך רישום', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '12hour' }, timeZone: 'Asia/Jerusalem' } },
]);

// Step 4: ScheduledMessages
await createTable('ScheduledMessages', [
  { name: 'תוכן ההודעה', type: 'multilineText' },
  { name: 'שליחה בשעה', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '12hour' }, timeZone: 'utc' } },
  { name: 'תזמון', type: 'singleLineText' },
  { name: 'סטטוס', type: 'singleSelect', options: { choices: [{ name: 'ממתינה' }, { name: 'נשלח' }, { name: 'נכשל' }] } },
  { name: 'נשלח בשעה', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '12hour' }, timeZone: 'utc' } },
]);

console.log('\nDone. Now add linked record fields manually in Airtable UI (API limitation).');
