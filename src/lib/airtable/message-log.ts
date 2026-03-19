/**
 * Message log service — creates audit records after send attempts.
 * NO 'server-only' import — used by Bree worker threads (plain Node.js).
 */

import { airtableBase } from './client';

interface MessageLogEntry {
  scheduled_message_id: string;
  contact_id: string;
  campaign_id: string;
  status: 'sent' | 'failed';
  green_api_response?: string;
  error_message?: string;
}

/**
 * Display entry type for rendering MessageLog records in the UI.
 * Returned by getMessageLogByCampaign.
 */
export interface MessageLogDisplayEntry {
  id: string;
  contact_id: string;
  full_name?: string;   // Airtable lookup field 'שם מלא' on MessageLog (if configured)
  phone?: string;       // Airtable lookup field 'טלפון' on MessageLog (if configured)
  status: 'sent' | 'failed';
  logged_at: string;    // from (r as any)._rawJson?.createdTime ?? ''
  error_message?: string;
}

/**
 * Create a record in the MessageLog Airtable table.
 * Hebrew field name mapping:
 *   'סטטוס'              — 'נשלחה' | 'נכשלה'
 *   'הודעה מתוזמנת'      — linked: [scheduled_message_id]
 *   'איש קשר'            — linked: [contact_id]
 *   'קמפיין'             — linked: [campaign_id]
 *   'תגובת GREEN API'    — green_api_response
 *   'הודעת שגיאה'        — error_message
 */
export async function createMessageLogEntry(entry: MessageLogEntry): Promise<void> {
  const hebrewStatus = entry.status === 'sent' ? 'נשלחה' : 'נכשלה';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fields: Record<string, any> = {
    'סטטוס': hebrewStatus,
    'הודעה מתוזמנת': [entry.scheduled_message_id],
    'איש קשר': [entry.contact_id],
    'קמפיין': [entry.campaign_id],
  };

  if (entry.green_api_response !== undefined) {
    fields['תגובת GREEN API'] = entry.green_api_response;
  }

  if (entry.error_message !== undefined) {
    fields['הודעת שגיאה'] = entry.error_message;
  }

  await airtableBase('MessageLog').create(fields);
}

/**
 * Fetch all MessageLog entries for a campaign, sorted by creation time descending.
 * Uses FIND+ARRAYJOIN filterByFormula (required for linked record fields in Airtable).
 */
export async function getMessageLogByCampaign(
  campaignId: string
): Promise<MessageLogDisplayEntry[]> {
  const records = await airtableBase('MessageLog')
    .select({
      filterByFormula: `FIND("${campaignId}", ARRAYJOIN({קמפיין}))`,
    })
    .all();

  // Sort client-side by createdTime descending (avoids Airtable 'Created' sort field ambiguity)
  const mapped = records.map((r) => {
    const rawStatus = r.fields['סטטוס'] as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createdTime: string = (r as any)._rawJson?.createdTime ?? '';
    return {
      id: r.id,
      contact_id: (r.fields['איש קשר'] as string[])?.[0] ?? '',
      full_name: r.fields['שם מלא'] as string | undefined,
      phone: r.fields['טלפון'] as string | undefined,
      status: (rawStatus === 'נשלחה' ? 'sent' : 'failed') as 'sent' | 'failed',
      logged_at: createdTime,
      error_message: r.fields['הודעת שגיאה'] as string | undefined,
    };
  });

  return mapped.sort((a, b) => b.logged_at.localeCompare(a.logged_at));
}

/**
 * Maps a raw GREEN API error string to a user-friendly Hebrew message.
 * Returns empty string for undefined/empty input.
 */
export function mapErrorToHebrew(rawError: string | undefined): string {
  if (!rawError) return '';
  const lower = rawError.toLowerCase();

  if (lower.includes('401') || lower.includes('notauthorized') || lower.includes('unauthorized')) {
    return 'גרין אפיאי מנותקת — הודעות לא נשלחות, נא להתחבר מחדש בהגדרות';
  }
  if (lower.includes('403') || lower.includes('not registered') || lower.includes('notregistered')) {
    return 'מספר הטלפון לא קיים בוואצאפ — בדקי את המספר בכרטיסיית אנשי קשר';
  }
  if (
    lower.includes('timeout') ||
    lower.includes('econnrefused') ||
    lower.includes('network') ||
    lower.includes('fetch')
  ) {
    return 'בעיית תקשורת זמנית — ההודעה לא נשלחה, נסי שוב מאוחר יותר';
  }
  return 'שגיאה לא ידועה — פני לתמיכה אם הבעיה חוזרת';
}
