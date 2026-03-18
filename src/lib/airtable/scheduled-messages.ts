import 'server-only';
import { airtableBase } from './client';
import type { ScheduledMessage } from './types';

export interface SlotData {
  offset_label: ScheduledMessage['offset_label'];
  message_content: string;
  send_at: string;
}

const OFFSET_LABEL_HE: Record<ScheduledMessage['offset_label'], string> = {
  week_before: 'שבוע לפני',
  day_before: 'יום לפני',
  morning: 'בוקר האירוע',
  half_hour: 'חצי שעה לפני',
};

export async function getScheduledMessagesByCampaign(
  campaignId: string
): Promise<ScheduledMessage[]> {
  const records = await airtableBase('ScheduledMessages')
    .select({
      filterByFormula: `FIND("${campaignId}", ARRAYJOIN({קמפיין}))`,
      sort: [{ field: 'שליחה בשעה', direction: 'asc' }],
    })
    .all();

  return records.map((r) => ({
    id: r.id,
    campaign_id: r.fields['קמפיין'] as string[],
    contact_id: r.fields['אנשי קשר'] as string[],
    message_content: r.fields['תוכן ההודעה'] as string,
    send_at: r.fields['שליחה בשעה'] as string,
    offset_label: r.fields['תזמון'] as ScheduledMessage['offset_label'],
    status: r.fields['סטטוס'] as ScheduledMessage['status'],
    sent_at: r.fields['נשלח בשעה'] as string | undefined,
  }));
}

export async function upsertScheduledMessages(
  campaignId: string,
  slots: SlotData[]
): Promise<void> {
  const records = slots
    .filter((s) => s.message_content.trim() !== '')
    .map((s) => ({
      fields: {
        'קמפיין': [campaignId],
        'תוכן ההודעה': s.message_content,
        'שליחה בשעה': s.send_at,
        'תזמון': OFFSET_LABEL_HE[s.offset_label],
        'סטטוס': 'ממתינה',
      },
    }));

  if (records.length === 0) return;

  await airtableBase('ScheduledMessages').create(records);
}

export async function updateScheduledMessage(
  recordId: string,
  fields: { message_content?: string; send_at?: string }
): Promise<void> {
  const update: Record<string, string> = {};
  if (fields.message_content !== undefined) update['תוכן ההודעה'] = fields.message_content;
  if (fields.send_at !== undefined) update['שליחה בשעה'] = fields.send_at;
  await airtableBase('ScheduledMessages').update(recordId, update);
}
