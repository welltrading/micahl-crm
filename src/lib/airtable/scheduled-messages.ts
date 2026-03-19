import 'server-only';
import { airtableBase } from './client';
import type { ScheduledMessage } from './types';
import { localIsraelToUTC } from './timezone';

export interface SlotData {
  slot_index: number;    // 1–4
  recordId?: string;     // existing Airtable record ID (for update)
  title: string;
  message_content: string;
  send_date: string;     // YYYY-MM-DD Israel local
  send_time: string;     // HH:MM Israel local
}

export async function getScheduledMessagesByCampaign(
  campaignId: string
): Promise<ScheduledMessage[]> {
  const records = await airtableBase('הודעות מתוזמנות')
    .select({
      filterByFormula: `FIND("${campaignId}", ARRAYJOIN({קמפיין}))`,
      sort: [{ field: 'מספר הודעה', direction: 'asc' }],
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
    slot_index: Number(r.fields['מספר הודעה']) || 0,
    status: (r.fields['סטטוס'] as ScheduledMessage['status']) ?? 'pending',
    sent_at: r.fields['נשלח בשעה'] as string | undefined,
  }));
}

export async function upsertScheduledMessages(
  campaignId: string,
  slots: SlotData[]
): Promise<void> {
  const filled = slots.filter((s) => s.message_content.trim() !== '');
  if (filled.length === 0) return;

  // Fetch existing records for this campaign
  const existing = await airtableBase('הודעות מתוזמנות')
    .select({ filterByFormula: `FIND("${campaignId}", ARRAYJOIN({קמפיין}))` })
    .all();

  // Group by slot_index — may have duplicates from past bugs
  const bySlot = new Map<number, string[]>(); // slot_index → [recordId, ...]
  for (const r of existing) {
    const idx = Number(r.fields['מספר הודעה']);
    if (idx) {
      const arr = bySlot.get(idx) ?? [];
      arr.push(r.id);
      bySlot.set(idx, arr);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toCreate: { fields: Record<string, any> }[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toUpdate: { id: string; fields: Record<string, any> }[] = [];
  const toDelete: string[] = [];

  for (const slot of filled) {
    const candidates = bySlot.get(slot.slot_index) ?? [];
    // Pick the record to keep: prefer slot.recordId if provided, else first candidate by slot_index
    const keepId = slot.recordId ?? candidates[0];

    // All other candidates for this slot_index are duplicates — delete them
    for (const id of candidates) {
      if (id !== keepId) toDelete.push(id);
    }

    const utcSendAt = localIsraelToUTC(slot.send_date, slot.send_time);
    const sharedFields = {
      'כותרת': slot.title,
      'תוכן ההודעה': slot.message_content,
      'תאריך שליחה': slot.send_date,
      'שעת שליחה': slot.send_time,
      'שליחה בשעה': utcSendAt,
    };

    if (keepId) {
      toUpdate.push({ id: keepId, fields: sharedFields });
    } else {
      toCreate.push({
        fields: {
          'קמפיין': [campaignId],
          ...sharedFields,
          'מספר הודעה': String(slot.slot_index),
          'סטטוס': 'ממתינה',
        },
      });
    }
  }

  // Delete duplicates first, then create/update
  if (toDelete.length > 0) await airtableBase('הודעות מתוזמנות').destroy(toDelete);
  if (toCreate.length > 0) await airtableBase('הודעות מתוזמנות').create(toCreate);
  if (toUpdate.length > 0) await airtableBase('הודעות מתוזמנות').update(toUpdate);
}

export async function createScheduledMessage(
  campaignId: string,
  slot: SlotData
): Promise<string> {
  const utcSendAt = localIsraelToUTC(slot.send_date, slot.send_time);
  const created = await airtableBase('הודעות מתוזמנות').create({
    'קמפיין': [campaignId],
    'כותרת': slot.title,
    'תוכן ההודעה': slot.message_content,
    'תאריך שליחה': slot.send_date,
    'שעת שליחה': slot.send_time,
    'שליחה בשעה': utcSendAt,
    'מספר הודעה': String(slot.slot_index),
    'סטטוס': 'ממתינה',
  });
  return created.id;
}

export async function updateScheduledMessage(
  recordId: string,
  fields: { title?: string; message_content?: string; send_date?: string; send_time?: string }
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {};
  if (fields.title !== undefined) update['כותרת'] = fields.title;
  if (fields.message_content !== undefined) update['תוכן ההודעה'] = fields.message_content;
  if (fields.send_date !== undefined) update['תאריך שליחה'] = fields.send_date;
  if (fields.send_time !== undefined) update['שעת שליחה'] = fields.send_time;
  // Write UTC only when we have both date and time to compute from
  if (fields.send_date !== undefined && fields.send_time !== undefined) {
    update['שליחה בשעה'] = localIsraelToUTC(fields.send_date, fields.send_time);
  }
  await airtableBase('הודעות מתוזמנות').update(recordId, update);
}
