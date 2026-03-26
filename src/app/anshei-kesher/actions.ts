'use server';
import { revalidatePath } from 'next/cache';
import { getContacts, createContact, getContactEnrollments, getContactMessages } from '@/lib/airtable/contacts';
import { normalizePhone } from '@/lib/airtable/phone';
import { getCampaigns } from '@/lib/airtable/campaigns';

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
  const normalized = normalizePhone(phone);
  const existing = await getContacts();
  const duplicate = existing.find((c) => {
    try { return c.phone && normalizePhone(c.phone) === normalized; }
    catch { return false; }
  });
  if (duplicate) return { error: 'המספר כבר קיים במערכת' };
  await createContact({ first_name: firstName.trim(), last_name: lastName.trim(), phone: normalized, email: email?.trim() || undefined, whatsapp_consent: whatsappConsent, campaign_id: campaignId });
  revalidatePath('/anshei-kesher');
  return { success: true };
}

export async function getContactDetail(contactId: string) {
  const [enrollments, messages, campaigns] = await Promise.all([
    getContactEnrollments(contactId),
    getContactMessages(contactId),
    getCampaigns(),
  ]);
  return { enrollments, messages, campaigns };
}
