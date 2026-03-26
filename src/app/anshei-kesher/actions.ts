'use server';
import { revalidatePath } from 'next/cache';
import { createContact, createEnrollment, findContactByPhone, getContactEnrollments, getContactMessages } from '@/lib/airtable/contacts';
import { normalizePhone } from '@/lib/airtable/phone';
import { getCampaigns, getCampaignById } from '@/lib/airtable/campaigns';

export async function addContact(
  firstName: string,
  lastName: string,
  phone: string,
  email?: string,
  whatsappConsent?: boolean,
  campaignId?: string,
): Promise<{ success: true } | { error: string }> {
  if (!firstName?.trim()) return { error: 'שם פרטי נדרש' };
  if (!lastName?.trim()) return { error: 'שם משפחה נדרש' };

  let normalized: string;
  try {
    normalized = normalizePhone(phone);
  } catch {
    return { error: 'מספר טלפון לא תקין' };
  }

  try {
    const duplicate = await findContactByPhone(normalized);

    let contactId: string;
    if (duplicate) {
      // Contact already exists — if free campaign selected, just enroll (no duplicate contact)
      if (campaignId) {
        const campaign = await getCampaignById(campaignId);
        if (campaign?.campaign_type === 'free') {
          await createEnrollment(duplicate.id, campaignId);
          revalidatePath('/anshei-kesher');
          return { success: true };
        }
      }
      return { error: 'המספר כבר קיים במערכת' };
    }

    const created = await createContact({ first_name: firstName.trim(), last_name: lastName.trim(), phone: normalized, email: email?.trim() || undefined, whatsapp_consent: whatsappConsent });
    contactId = created.id;
    if (campaignId) {
      const campaign = await getCampaignById(campaignId);
      if (campaign?.campaign_type === 'free') await createEnrollment(contactId, campaignId);
    }
    revalidatePath('/anshei-kesher');
    return { success: true };
  } catch (err) {
    console.error('addContact error:', err);
    return { error: 'אירעה שגיאה בשמירה. נסי שנית.' };
  }
}

export async function getContactDetail(contactId: string) {
  const [enrollments, messages, campaigns] = await Promise.all([
    getContactEnrollments(contactId),
    getContactMessages(contactId),
    getCampaigns(),
  ]);
  return { enrollments, messages, campaigns };
}
