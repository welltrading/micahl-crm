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

  const fields: Record<string, unknown> = {
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
