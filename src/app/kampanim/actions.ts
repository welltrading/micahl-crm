'use server';

import { createCampaign } from '@/lib/airtable/campaigns';
import {
  getScheduledMessagesByCampaign,
  upsertScheduledMessages,
  updateScheduledMessage,
  type SlotData,
} from '@/lib/airtable/scheduled-messages';
import type { Campaign, ScheduledMessage } from '@/lib/airtable/types';

export async function createCampaignAction(
  formData: FormData
): Promise<{ campaign: Campaign } | { error: string }> {
  try {
    const campaign_name = (formData.get('campaign_name') as string | null)?.trim() ?? '';
    const event_date = (formData.get('event_date') as string | null)?.trim() ?? '';
    const event_time = (formData.get('event_time') as string | null)?.trim() ?? '';
    const description = (formData.get('description') as string | null)?.trim() || undefined;

    if (!campaign_name) {
      return { error: 'שם קמפיין הוא שדה חובה' };
    }
    if (!event_date) {
      return { error: 'תאריך האירוע הוא שדה חובה' };
    }
    if (!event_time) {
      return { error: 'שעת האירוע היא שדה חובה' };
    }

    const campaign = await createCampaign({
      campaign_name,
      event_date,
      event_time,
      description,
    });

    return { campaign };
  } catch (err) {
    console.error('createCampaignAction error:', err);
    return { error: 'אירעה שגיאה ביצירת הקמפיין. נסי שנית.' };
  }
}

export async function getCampaignMessagesAction(
  campaignId: string
): Promise<{ messages: ScheduledMessage[] } | { error: string }> {
  try {
    if (!campaignId) {
      return { error: 'campaignId is required' };
    }
    const messages = await getScheduledMessagesByCampaign(campaignId);
    return { messages };
  } catch (err) {
    console.error('getCampaignMessagesAction error:', err);
    return { error: 'שגיאה בטעינת ההודעות' };
  }
}

export async function saveMessagesAction(
  campaignId: string,
  slots: SlotData[]
): Promise<{ ok: true } | { error: string }> {
  try {
    if (!campaignId) {
      return { error: 'campaignId is required' };
    }
    if (!Array.isArray(slots)) {
      return { error: 'slots must be an array' };
    }
    await upsertScheduledMessages(campaignId, slots);
    return { ok: true };
  } catch (err) {
    console.error('saveMessagesAction error:', err);
    return { error: 'שגיאה בשמירת ההודעות. נסי שנית.' };
  }
}

export async function updateMessageTimeAction(
  recordId: string,
  send_at: string
): Promise<{ ok: true } | { error: string }> {
  try {
    if (!recordId) {
      return { error: 'recordId is required' };
    }
    if (!send_at) {
      return { error: 'send_at is required' };
    }
    // Validate it is a valid ISO string
    const parsed = new Date(send_at);
    if (isNaN(parsed.getTime())) {
      return { error: 'send_at must be a valid ISO date string' };
    }
    await updateScheduledMessage(recordId, { send_at });
    return { ok: true };
  } catch (err) {
    console.error('updateMessageTimeAction error:', err);
    return { error: 'שגיאה בעדכון זמן ההודעה. נסי שנית.' };
  }
}
