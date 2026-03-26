'use server';

import { createCampaign, deleteCampaign, updateCampaignWelcomeMessage, getEnrolleesForCampaign, deleteEnrollment } from '@/lib/airtable/campaigns';
import { getMessageLogByCampaign, type MessageLogDisplayEntry } from '@/lib/airtable/message-log';
import {
  getScheduledMessagesByCampaign,
  createScheduledMessage,
  updateScheduledMessage,
  type SlotData,
} from '@/lib/airtable/scheduled-messages';
import type { Campaign, Contact, EnrolleeDisplayEntry, InterestedDisplayEntry, ScheduledMessage } from '@/lib/airtable/types';
import { getEnrollmentsForCampaign } from '@/lib/airtable/scheduler-services';
import { getContactById, getContacts, getEnrolledContactIds, getInterestedByCampaign } from '@/lib/airtable/contacts';
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
    const campaign_type = formData.get('campaign_type') === 'paid' ? 'paid' : 'free';

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
      campaign_type,
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

export async function saveWelcomeMessageAction(
  campaignId: string,
  title: string,
  content: string,
): Promise<{ ok: true } | { error: string }> {
  try {
    if (!campaignId) return { error: 'campaignId is required' };
    if (!content.trim()) return { error: 'יש למלא תוכן הודעה.' };
    await updateCampaignWelcomeMessage(campaignId, title, content);
    return { ok: true };
  } catch (err) {
    console.error('saveWelcomeMessageAction error:', err);
    return { error: 'שגיאה בשמירת הודעת ברוכה הבאה. נסי שנית.' };
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

export type BroadcastTarget =
  | 'enrolled_campaign'
  | 'interested_campaign'
  | 'all_interested'
  | 'enrolled_and_interested_campaign'
  | 'enrolled_and_all_interested';

export async function broadcastAction(
  campaignId: string,
  campaignName: string,
  messageContent: string,
  target: BroadcastTarget = 'enrolled_campaign',
): Promise<{ ok: true; queued: true } | { error: string }> {
  if (!messageContent.trim()) return { error: 'messageContent is required' };
  if (!campaignId) return { error: 'campaignId is required' };

  const webhookUrl = process.env.MAKE_BROADCAST_WEBHOOK_URL;
  if (!webhookUrl) return { error: 'MAKE_BROADCAST_WEBHOOK_URL not configured' };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: campaignId, campaign_name: campaignName, message_content: messageContent, target }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('broadcastAction Make webhook error:', res.status, text);
      return { error: 'שגיאה בשליחה למייק. נסי שנית.' };
    }

    return { ok: true, queued: true };
  } catch (err) {
    console.error('broadcastAction error:', err);
    return { error: 'שגיאה בשליחת ה-broadcast. נסי שנית.' };
  }
}

export async function broadcastFromPageAction(
  messageContent: string,
  target: BroadcastTarget,
  campaignId?: string,
  campaignName?: string,
): Promise<{ ok: true; queued: true } | { error: string }> {
  if (!messageContent.trim()) return { error: 'messageContent is required' };

  const needsCampaign = target !== 'all_interested';
  if (needsCampaign && !campaignId) return { error: 'יש לבחור קמפיין עבור יעד זה' };

  const webhookUrl = process.env.MAKE_BROADCAST_WEBHOOK_URL;
  if (!webhookUrl) return { error: 'MAKE_BROADCAST_WEBHOOK_URL not configured' };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(campaignId ? { campaign_id: campaignId, campaign_name: campaignName } : {}),
        message_content: messageContent,
        target,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('broadcastFromPageAction Make webhook error:', res.status, text);
      return { error: 'שגיאה בשליחה למייק. נסי שנית.' };
    }

    return { ok: true, queued: true };
  } catch (err) {
    console.error('broadcastFromPageAction error:', err);
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

export async function getEnrolleesAction(
  campaignId: string
): Promise<{ enrollees: EnrolleeDisplayEntry[] } | { error: string }> {
  try {
    if (!campaignId) return { error: 'campaignId is required' };
    const raw = await getEnrolleesForCampaign(campaignId);
    const enrollees: EnrolleeDisplayEntry[] = raw.map((e) => ({
      enrollment_id: e.enrollment_id,
      full_name: e.full_name,
      phone: e.phone,
      email: e.email,
      whatsapp_confirmed: e.whatsapp_confirmed,
    }));
    return { enrollees };
  } catch (err) {
    console.error('getEnrolleesAction error:', err);
    return { error: String(err) };
  }
}

export async function removeEnrollmentAction(
  enrollmentId: string
): Promise<{ ok: true } | { error: string }> {
  try {
    if (!enrollmentId) return { error: 'enrollmentId is required' };
    await deleteEnrollment(enrollmentId);
    return { ok: true };
  } catch (err) {
    console.error('removeEnrollmentAction error:', err);
    return { error: 'שגיאה בביטול הרישום. נסי שנית.' };
  }
}

export async function getInterestedForCampaignAction(
  campaignId: string
): Promise<{ interested: InterestedDisplayEntry[] } | { error: string }> {
  try {
    if (!campaignId) return { error: 'campaignId is required' };
    const interested = await getInterestedByCampaign(campaignId);
    return { interested };
  } catch (err) {
    console.error('getInterestedForCampaignAction error:', err);
    return { error: String(err) };
  }
}
