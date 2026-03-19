import { airtableBase } from './client';
import type { Contact, CampaignEnrollment, ScheduledMessage } from './types';
import { normalizePhone } from './phone';

// Airtable field names are Hebrew (as set up in Plan 02 schema)
// API field name = Hebrew display name in this project

export async function getContacts(): Promise<Contact[]> {
  const records = await airtableBase('Contacts')
    .select()
    .all();

  return records
    .map((r) => ({
      id: r.id,
      full_name: r.fields['שם מלא'] as string,
      phone: r.fields['טלפון'] as string,
      joined_date: r.fields['תאריך הצטרפות'] as string | undefined,
      notes: r.fields['הערות'] as string | undefined,
      created_at: r._rawJson.createdTime as string,
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getContactById(id: string): Promise<Contact | null> {
  try {
    const record = await airtableBase('Contacts').find(id);
    return {
      id: record.id,
      full_name: record.fields['שם מלא'] as string,
      phone: record.fields['טלפון'] as string,
      joined_date: record.fields['תאריך הצטרפות'] as string | undefined,
      notes: record.fields['הערות'] as string | undefined,
      created_at: record._rawJson.createdTime as string,
    };
  } catch {
    return null;
  }
}

/**
 * Creates a new contact in Airtable.
 * Normalizes the phone number to 972XXXXXXXXXX before storing.
 * Sets joined_date to today's ISO date.
 */
export async function createContact(input: {
  full_name: string;
  phone: string;
}): Promise<{ success: true }> {
  const today = new Date().toISOString().split('T')[0];

  await airtableBase('Contacts').create(
    {
      'שם מלא': input.full_name,
      'טלפון': normalizePhone(input.phone),
      'תאריך הצטרפות': today,
    },
    { typecast: true }
  );

  return { success: true };
}

/**
 * Returns all CampaignEnrollments linked to a specific contact.
 * Uses FIND + ARRAYJOIN filterByFormula — required for Airtable linked record fields.
 */
export async function getContactEnrollments(contactId: string): Promise<CampaignEnrollment[]> {
  const records = await airtableBase('CampaignEnrollments')
    .select({
      filterByFormula: `FIND("${contactId}", ARRAYJOIN({איש קשר}))`,
    })
    .all();

  return records.map((r) => ({
    id: r.id,
    campaign_id: r.fields['קמפיין'] as string[],
    contact_id: r.fields['איש קשר'] as string[],
    enrolled_at: r.fields['תאריך רישום'] as string | undefined,
    source: mapEnrollmentSource(r.fields['מקור'] as string),
  }));
}

/**
 * Returns all ScheduledMessages linked to a specific contact.
 * Uses FIND + ARRAYJOIN filterByFormula — required for Airtable linked record fields.
 */
export async function getContactMessages(contactId: string): Promise<ScheduledMessage[]> {
  const records = await airtableBase('ScheduledMessages')
    .select({
      filterByFormula: `FIND("${contactId}", ARRAYJOIN({איש קשר}))`,
    })
    .all();

  return records.map((r) => ({
    id: r.id,
    campaign_id: r.fields['קמפיין'] as string[],
    contact_id: (r.fields['איש קשר'] ?? []) as string[],
    title: (r.fields['כותרת'] as string) ?? '',
    message_content: (r.fields['תוכן ההודעה'] as string) ?? '',
    send_date: (r.fields['תאריך שליחה'] as string) ?? '',
    send_time: (r.fields['שעת שליחה'] as string) ?? '09:00',
    send_at: (r.fields['שליחה בשעה'] as string) ?? '',
    slot_index: Number(r.fields['תזמון']) || 0,
    status: mapMessageStatus(r.fields['סטטוס'] as string),
    sent_at: r.fields['נשלח בשעה'] as string | undefined,
  }));
}

// --- Private helpers ---

function mapEnrollmentSource(source: string): 'manual' | 'webhook' {
  return source === 'Webhook' ? 'webhook' : 'manual';
}

function mapMessageStatus(status: string): ScheduledMessage['status'] {
  switch (status) {
    case 'ממתינה':
      return 'pending';
    case 'שולח':
      return 'sending';
    case 'נשלחה':
      return 'sent';
    case 'נכשלה':
      return 'failed';
    default:
      throw new Error(`Unknown message status: "${status}"`);
  }
}
