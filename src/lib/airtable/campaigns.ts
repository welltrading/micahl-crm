import { airtableBase } from './client';
import type { Campaign } from './types';

// Airtable field names are Hebrew (as set up in Plan 02 schema)
// API field name = Hebrew display name in this project

export async function getCampaigns(): Promise<Campaign[]> {
  const records = await airtableBase('Campaigns')
    .select({
      sort: [{ field: 'תאריך אירוע', direction: 'desc' }],
    })
    .all();

  return records.map((r) => ({
    id: r.id,
    campaign_name: r.fields['שם קמפיין'] as string,
    event_date: r.fields['תאריך אירוע'] as string,
    description: r.fields['תיאור'] as string | undefined,
    status: r.fields['סטטוס'] as Campaign['status'],
    created_at: r.fields['נוצר בתאריך'] as string,
  }));
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  try {
    const record = await airtableBase('Campaigns').find(id);
    return {
      id: record.id,
      campaign_name: record.fields['שם קמפיין'] as string,
      event_date: record.fields['תאריך אירוע'] as string,
      description: record.fields['תיאור'] as string | undefined,
      status: record.fields['סטטוס'] as Campaign['status'],
      created_at: record.fields['נוצר בתאריך'] as string,
    };
  } catch {
    return null;
  }
}
