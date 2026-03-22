import { airtableBase } from './client';
import type { Contact, CampaignEnrollment, ScheduledMessage } from './types';
import { normalizePhone } from './phone';

// Airtable field names are Hebrew (as set up in Plan 02 schema)
// API field name = Hebrew display name in this project

export async function getContacts(): Promise<Contact[]> {
  const records = await airtableBase('מתענינות')
    .select()
    .all();

  return records
    .map((r) => ({
      id: r.id,
      first_name: (r.fields['שם פרטי'] as string) ?? '',
      last_name: (r.fields['שם משפחה'] as string) ?? '',
      full_name: (r.fields['שם מלא'] as string) ?? '',
      email: r.fields['כתובת מייל'] as string | undefined,
      phone: r.fields['טלפון'] as string,
      joined_date: r.fields['תאריך הצטרפות'] as string | undefined,
      notes: r.fields['הערות'] as string | undefined,
      created_at: r._rawJson.createdTime as string,
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getContactById(id: string): Promise<Contact | null> {
  try {
    const record = await airtableBase('מתענינות').find(id);
    return {
      id: record.id,
      first_name: (record.fields['שם פרטי'] as string) ?? '',
      last_name: (record.fields['שם משפחה'] as string) ?? '',
      full_name: (record.fields['שם מלא'] as string) ?? '',
      email: record.fields['כתובת מייל'] as string | undefined,
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
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
}): Promise<{ success: true }> {
  const today = new Date().toISOString().split('T')[0];

  await airtableBase('מתענינות').create(
    {
      'שם פרטי': input.first_name,
      'שם משפחה': input.last_name,
      'טלפון': normalizePhone(input.phone),
      'תאריך הצטרפות': today,
      ...(input.email ? { 'כתובת מייל': input.email } : {}),
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
  const records = await airtableBase('נרשמות')
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
  const records = await airtableBase('הודעות מתוזמנות')
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

/**
 * Returns unique contact IDs across all enrollments (נרשמות table).
 * Used for "send to all enrolled contacts" broadcast.
 */
export async function getEnrolledContactIds(): Promise<string[]> {
  const records = await airtableBase('נרשמות')
    .select({ fields: ['איש קשר'] })
    .all();

  const ids = new Set<string>();
  for (const r of records) {
    const contactIds = r.fields['איש קשר'] as string[] | undefined;
    if (contactIds) {
      for (const id of contactIds) ids.add(id);
    }
  }
  return Array.from(ids);
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
