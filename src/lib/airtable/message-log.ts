/**
 * Message log service — creates audit records after send attempts.
 * NO 'server-only' import — used by Bree worker threads (plain Node.js).
 */

import { airtableBase } from './client';
import type { MessageLogDisplayEntry } from './message-log-client';
export type { MessageLogDisplayEntry } from './message-log-client';
export { mapErrorToHebrew } from './message-log-client';

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

  await airtableBase('יומן הודעות').create(fields);
}

/**
 * Fetch all MessageLog entries for a campaign, sorted by creation time descending.
 * Uses FIND+ARRAYJOIN filterByFormula (required for linked record fields in Airtable).
 */
export async function getMessageLogByCampaign(
  campaignId: string
): Promise<MessageLogDisplayEntry[]> {
  const records = await airtableBase('יומן הודעות')
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
 * Count MessageLog records with status 'נשלחה' created during the current calendar month (UTC boundaries).
 */
export async function getMessagesSentThisMonth(): Promise<number> {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const firstOfMonth = new Date(Date.UTC(year, month, 1)).toISOString();
  const firstOfNext = new Date(Date.UTC(year, month + 1, 1)).toISOString();

  const records = await airtableBase('יומן הודעות')
    .select({
      filterByFormula: `AND({סטטוס} = 'נשלחה', IS_AFTER(CREATED_TIME(), '${firstOfMonth}'), IS_BEFORE(CREATED_TIME(), '${firstOfNext}'))`,
      fields: ['סטטוס'],
    })
    .all();

  return records.length;
}

/**
 * Count sent messages per campaign (single Airtable call, client-side aggregation).
 * Returns Record<campaignId, sentCount>. Returns {} when no sent records exist.
 */
export async function getMessageLogSentCountsByCampaign(): Promise<Record<string, number>> {
  const records = await airtableBase('יומן הודעות')
    .select({
      filterByFormula: `{סטטוס} = 'נשלחה'`,
      fields: ['קמפיין'],
    })
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
