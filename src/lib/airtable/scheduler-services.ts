/**
 * Scheduler service layer — Airtable operations for the message scheduler.
 * NO 'server-only' import — this file is used by Bree worker threads (plain Node.js).
 * Uses relative imports only (no @/ aliases) for worker thread compatibility.
 */

import { airtableBase } from './client';
import type { ScheduledMessage, CampaignEnrollment } from './types';

// Hebrew field names for ScheduledMessages table
const STATUS_FIELD = 'סטטוס';
const SEND_AT_FIELD = 'נשלח בשעה';
const CONTENT_FIELD = 'תוכן ההודעה';
const TITLE_FIELD = 'כותרת';
const CAMPAIGN_FIELD = 'קמפיין';
const CONTACT_FIELD = 'איש קשר';
const SLOT_FIELD = 'מספר הודעה';

// Hebrew status values
const STATUS_PENDING = 'ממתינה';
const STATUS_SENDING = 'בשליחה';
const STATUS_SENT = 'נשלחה';
const STATUS_FAILED = 'נכשלה';

function mapAirtableStatus(
  hebrewStatus: string | undefined
): ScheduledMessage['status'] {
  switch (hebrewStatus) {
    case STATUS_SENDING:
      return 'sending';
    case STATUS_SENT:
      return 'sent';
    case STATUS_FAILED:
      return 'failed';
    default:
      return 'pending';
  }
}

function mapRecord(record: { id: string; fields: Record<string, unknown> }): ScheduledMessage {
  const f = record.fields;
  return {
    id: record.id,
    campaign_id: (f[CAMPAIGN_FIELD] as string[]) ?? [],
    contact_id: (f[CONTACT_FIELD] as string[]) ?? [],
    title: (f[TITLE_FIELD] as string) ?? '',
    message_content: (f[CONTENT_FIELD] as string) ?? '',
    send_date: '',
    send_time: '',
    slot_index: Number(f[SLOT_FIELD] ?? 0),
    status: mapAirtableStatus(f[STATUS_FIELD] as string | undefined),
    sent_at: (f[SEND_AT_FIELD] as string) ?? undefined,
  };
}

/**
 * Fetch all ScheduledMessages with status 'ממתינה' whose send time is before nowIso.
 */
export async function getPendingMessagesDue(nowIso: string): Promise<ScheduledMessage[]> {
  const formula = `AND({${STATUS_FIELD}} = '${STATUS_PENDING}', IS_BEFORE({${SEND_AT_FIELD}}, NOW()))`;
  const records = await airtableBase('הודעות מתוזמנות')
    .select({ filterByFormula: formula })
    .all();
  return records.map(mapRecord);
}

/**
 * Mark a ScheduledMessage as 'בשליחה' (sending) — idempotent transition lock.
 */
export async function markMessageSending(id: string): Promise<void> {
  await airtableBase('הודעות מתוזמנות').update(id, { [STATUS_FIELD]: STATUS_SENDING });
}

/**
 * Mark a ScheduledMessage as 'נשלחה' (sent) and record the sent timestamp.
 */
export async function markMessageSent(id: string): Promise<void> {
  await airtableBase('הודעות מתוזמנות').update(id, {
    [STATUS_FIELD]: STATUS_SENT,
    [SEND_AT_FIELD]: new Date().toISOString(),
  });
}

/**
 * Mark a ScheduledMessage as 'נכשלה' (failed).
 */
export async function markMessageFailed(id: string): Promise<void> {
  await airtableBase('הודעות מתוזמנות').update(id, { [STATUS_FIELD]: STATUS_FAILED });
}

/**
 * Reset any messages stuck in 'בשליחה' status back to 'ממתינה'.
 * Called on scheduler startup to recover from crashes.
 */
export async function resetStuckSendingMessages(): Promise<void> {
  const formula = `{${STATUS_FIELD}} = '${STATUS_SENDING}'`;
  const records = await airtableBase('הודעות מתוזמנות')
    .select({ filterByFormula: formula })
    .all();

  for (const record of records) {
    await airtableBase('הודעות מתוזמנות').update(record.id, {
      [STATUS_FIELD]: STATUS_PENDING,
    });
  }
}

/**
 * Fetch all CampaignEnrollments for a given campaign ID.
 * Uses FIND+ARRAYJOIN pattern required for Airtable linked record filtering.
 */
export async function getEnrollmentsForCampaign(
  campaignId: string
): Promise<CampaignEnrollment[]> {
  const formula = `FIND("${campaignId}", ARRAYJOIN({${CAMPAIGN_FIELD}}))`;
  const records = await airtableBase('נרשמות')
    .select({ filterByFormula: formula })
    .all();

  return records.map((record) => {
    const f = record.fields as Record<string, unknown>;
    const rawSource = f['מקור'] as string | undefined;
    const source: CampaignEnrollment['source'] =
      rawSource === 'Webhook' ? 'webhook' : 'manual';

    return {
      id: record.id,
      campaign_id: (f[CAMPAIGN_FIELD] as string[]) ?? [],
      contact_id: (f[CONTACT_FIELD] as string[]) ?? [],
      enrolled_at: (f['תאריך רישום'] as string) ?? undefined,
      source,
    };
  });
}
