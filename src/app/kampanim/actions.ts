'use server';

import { createCampaign, deleteCampaign } from '@/lib/airtable/campaigns';
import { getMessageLogByCampaign, type MessageLogDisplayEntry } from '@/lib/airtable/message-log';
import {
  getScheduledMessagesByCampaign,
  createScheduledMessage,
  updateScheduledMessage,
  type SlotData,
} from '@/lib/airtable/scheduled-messages';
import type { Campaign, ScheduledMessage } from '@/lib/airtable/types';
import { getEnrollmentsForCampaign } from '@/lib/airtable/scheduler-services';
import { getContactById } from '@/lib/airtable/contacts';
import { sendWhatsAppMessage } from '@/lib/airtable/green-api';
import { normalizePhone } from '@/lib/airtable/phone';

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
): Promise<{ ok: true; savedSlots: Array<{ slot_index: number; recordId: string }> } | { error: string }> {
  try {
    if (!campaignId) return { error: 'campaignId is required' };
    if (!Array.isArray(slots)) return { error: 'slots must be an array' };

    const savedSlots: Array<{ slot_index: number; recordId: string }> = [];

    for (const slot of slots) {
      if (!slot.message_content.trim()) continue;
      const fields = {
        title: slot.title,
        message_content: slot.message_content,
        send_date: slot.send_date,
        send_time: slot.send_time,
      };
      if (slot.recordId) {
        await updateScheduledMessage(slot.recordId, fields);
        savedSlots.push({ slot_index: slot.slot_index, recordId: slot.recordId });
      } else {
        const newId = await createScheduledMessage(campaignId, slot);
        savedSlots.push({ slot_index: slot.slot_index, recordId: newId });
      }
    }

    return { ok: true, savedSlots };
  } catch (err) {
    console.error('saveMessagesAction error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `שגיאה: ${msg}` };
  }
}

export async function deleteCampaignAction(
  campaignId: string
): Promise<{ ok: true } | { error: string }> {
  try {
    if (!campaignId) return { error: 'campaignId is required' };
    await deleteCampaign(campaignId);
    return { ok: true };
  } catch (err) {
    console.error('deleteCampaignAction error:', err);
    return { error: 'שגיאה במחיקת הקמפיין. נסה שנית.' };
  }
}

export async function updateMessageTimeAction(
  recordId: string,
  send_date: string,   // YYYY-MM-DD Israel local
  send_time: string,   // HH:MM Israel local
): Promise<{ ok: true } | { error: string }> {
  try {
    if (!recordId) return { error: 'recordId is required' };
    if (!send_date) return { error: 'send_date is required' };
    if (!send_time) return { error: 'send_time is required' };

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(send_date)) {
      return { error: 'send_date must be YYYY-MM-DD' };
    }
    // Validate time format HH:MM
    if (!/^\d{2}:\d{2}$/.test(send_time)) {
      return { error: 'send_time must be HH:MM' };
    }

    // updateScheduledMessage writes שליחה בשעה (UTC) when both date+time provided
    await updateScheduledMessage(recordId, { send_date, send_time });
    return { ok: true };
  } catch (err) {
    console.error('updateMessageTimeAction error:', err);
    return { error: 'שגיאה בעדכון זמן ההודעה. נסי שנית.' };
  }
}

export async function broadcastAction(
  campaignId: string,
  messageContent: string,
): Promise<{ ok: true; sent: number; failed: number } | { error: string }> {
  if (!campaignId) return { error: 'campaignId is required' };
  if (!messageContent.trim()) return { error: 'messageContent is required' };

  try {
    const enrollments = await getEnrollmentsForCampaign(campaignId);
    let sent = 0;
    let failed = 0;

    for (const enrollment of enrollments) {
      const contact = await getContactById(enrollment.contact_id[0]);
      if (!contact) { failed++; continue; }

      try {
        const chatId = normalizePhone(contact.phone) + '@c.us';
        await sendWhatsAppMessage(chatId, messageContent);
        sent++;
      } catch {
        failed++;
      }

      // GREEN API minimum 500ms delay; use 1000ms for safety
      await new Promise(r => setTimeout(r, 1000));
    }

    return { ok: true, sent, failed };
  } catch (err) {
    console.error('broadcastAction error:', err);
    return { error: 'שגיאה בשליחת ה-broadcast. נסי שנית.' };
  }
}

export async function getCampaignLogAction(
  campaignId: string
): Promise<{ entries: MessageLogDisplayEntry[] } | { error: string }> {
  try {
    if (!campaignId) return { error: 'campaignId is required' };
    const entries = await getMessageLogByCampaign(campaignId);
    return { entries };
  } catch (err) {
    console.error('getCampaignLogAction error:', err);
    return { error: 'שגיאה בטעינת יומן השליחות' };
  }
}
