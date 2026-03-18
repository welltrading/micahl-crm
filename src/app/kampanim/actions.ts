'use server';

import { createCampaign } from '@/lib/airtable/campaigns';
import type { Campaign } from '@/lib/airtable/types';

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
