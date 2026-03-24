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
  const records = await airtableBase('קמפיין')
    .select({
      sort: [{ field: 'תאריך אירוע', direction: 'desc' }],
    })
    .all();

  return records.map((r) => ({
    id: r.id,
    campaign_name: r.fields['שם קמפיין'] as string,
    event_date: r.fields['תאריך אירוע'] as string,
    event_time: r.fields['שעת האירוע'] as string | undefined,
    description: r.fields['תיאור'] as string | undefined,
    status: deriveCampaignStatus(r.fields['תאריך אירוע'] as string),
    created_at: r._rawJson.createdTime as string,
    welcome_message_title: r.fields['כותרת ברוכה הבאה'] as string | undefined,
    welcome_message: r.fields['הודעת ברוכה הבאה'] as string | undefined,
  }));
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  try {
    const record = await airtableBase('קמפיין').find(id);
    return {
      id: record.id,
      campaign_name: record.fields['שם קמפיין'] as string,
      event_date: record.fields['תאריך אירוע'] as string,
      event_time: record.fields['שעת האירוע'] as string | undefined,
      description: record.fields['תיאור'] as string | undefined,
      status: deriveCampaignStatus(record.fields['תאריך אירוע'] as string),
      created_at: record._rawJson.createdTime as string,
      welcome_message_title: record.fields['כותרת ברוכה הבאה'] as string | undefined,
      welcome_message: record.fields['הודעת ברוכה הבאה'] as string | undefined,
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
  const record = await airtableBase('קמפיין').create({
    'שם קמפיין': params.campaign_name,
    'תאריך אירוע': params.event_date,
    ...(params.event_time !== undefined ? { 'שעת האירוע': params.event_time } : {}),
    'תיאור': params.description ?? '',
  });

  return {
    id: record.id,
    campaign_name: record.fields['שם קמפיין'] as string,
    event_date: record.fields['תאריך אירוע'] as string,
    event_time: record.fields['שעת האירוע'] as string | undefined,
    description: record.fields['תיאור'] as string | undefined,
    status: deriveCampaignStatus(record.fields['תאריך אירוע'] as string),
    created_at: record.fields['נוצר בתאריך'] as string,
  };
}

export async function updateCampaignWelcomeMessage(
  id: string,
  title: string,
  content: string,
): Promise<void> {
  await airtableBase('קמפיין').update(id, {
    'כותרת ברוכה הבאה': title,
    'הודעת ברוכה הבאה': content,
  });
}

export async function deleteCampaign(id: string): Promise<void> {
  await airtableBase('קמפיין').destroy(id);
}

export async function getEnrolleesForCampaign(
  campaignId: string
): Promise<Array<{ enrollment_id: string; full_name: string; phone: string; email?: string; whatsapp_confirmed?: boolean }>> {
  const records = await airtableBase('נרשמות').select().all();

  return records
    .filter((r) => {
      const ids = r.fields['קמפיין'] as string[] | undefined;
      return ids?.includes(campaignId) ?? false;
    })
    .map((r) => ({
      enrollment_id: r.id,
      full_name: (r.fields['שם מלא'] as string) ?? '',
      phone: (r.fields['טלפון'] as string) ?? '',
      email: r.fields['כתובת מייל'] as string | undefined,
      whatsapp_confirmed: r.fields['אישרה וואטסאפ'] as boolean | undefined,
    }));
}

export async function getInterestedCount(): Promise<number> {
  const records = await airtableBase('מתעניינות')
    .select({ fields: [] })
    .all();
  return records.length;
}

export async function getInterestedCountByCampaign(campaignId: string): Promise<number | null> {
  try {
    const records = await airtableBase('מתעניינות')
      .select({ fields: ['קמפיין'] })
      .all();
    const matched = records.filter((r) => {
      const ids = r.fields['קמפיין'] as string[] | undefined;
      return ids?.includes(campaignId) ?? false;
    });
    return matched.length;
  } catch {
    // Field may not exist yet in Airtable
    return null;
  }
}

export async function deleteEnrollment(enrollmentId: string): Promise<void> {
  await airtableBase('נרשמות').destroy(enrollmentId);
}

export async function getEnrollmentCountsByCampaign(): Promise<Record<string, number>> {
  const records = await airtableBase('נרשמות')
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
