import { airtableBase } from './client';
import type { Campaign } from './types';

// Airtable field names are Hebrew (as set up in Plan 02 schema)
// API field name = Hebrew display name in this project

export function deriveCampaignStatus(eventDateISO: string): Campaign['status'] {
  const now = new Date();
  const eventDate = new Date(eventDateISO);
  const dayAfterEvent = new Date(eventDate);
  dayAfterEvent.setUTCDate(dayAfterEvent.getUTCDate() + 1);

  if (now < eventDate) return 'future';
  if (now < dayAfterEvent) return 'active';
  return 'ended';
}

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
    status: deriveCampaignStatus(r.fields['תאריך אירוע'] as string),
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
      status: deriveCampaignStatus(record.fields['תאריך אירוע'] as string),
      created_at: record.fields['נוצר בתאריך'] as string,
    };
  } catch {
    return null;
  }
}

export async function createCampaign(params: {
  campaign_name: string;
  event_date: string;
  event_time?: string;
  description?: string;
}): Promise<Campaign> {
  const record = await airtableBase('Campaigns').create({
    'שם קמפיין': params.campaign_name,
    'תאריך אירוע': params.event_date,
    ...(params.event_time !== undefined ? { 'שעת האירוע': params.event_time } : {}),
    'תיאור': params.description ?? '',
  });

  return {
    id: record.id,
    campaign_name: record.fields['שם קמפיין'] as string,
    event_date: record.fields['תאריך אירוע'] as string,
    description: record.fields['תיאור'] as string | undefined,
    status: deriveCampaignStatus(record.fields['תאריך אירוע'] as string),
    created_at: record.fields['נוצר בתאריך'] as string,
  };
}

export async function getEnrollmentCountsByCampaign(): Promise<Record<string, number>> {
  const records = await airtableBase('CampaignEnrollments')
    .select({ fields: ['קמפיין'] })
    .all();

  const counts: Record<string, number> = {};
  for (const r of records) {
    const campaignIds = r.fields['קמפיין'] as string[] | undefined;
    if (campaignIds) {
      for (const id of campaignIds) {
        counts[id] = (counts[id] ?? 0) + 1;
      }
    }
  }
  return counts;
}
