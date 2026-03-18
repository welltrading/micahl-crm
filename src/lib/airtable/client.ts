import 'server-only'; // Next.js package — throws if imported in a client component
import Airtable from 'airtable';

if (!process.env.AIRTABLE_API_TOKEN) {
  throw new Error(
    'AIRTABLE_API_TOKEN is not set — Airtable client must be used server-side only'
  );
}
if (!process.env.AIRTABLE_BASE_ID) {
  throw new Error('AIRTABLE_BASE_ID is not set');
}

export const airtableBase = new Airtable({
  apiKey: process.env.AIRTABLE_API_TOKEN,
}).base(process.env.AIRTABLE_BASE_ID);
