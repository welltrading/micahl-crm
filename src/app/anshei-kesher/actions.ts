'use server';
import { revalidatePath } from 'next/cache';
import { getContacts, createContact } from '@/lib/airtable/contacts';
import { normalizePhone } from '@/lib/airtable/phone';

export async function addContact(
  fullName: string,
  phone: string
): Promise<{ success: true } | { error: string }> {
  if (!fullName?.trim()) return { error: 'שם מלא נדרש' };
  const normalized = normalizePhone(phone);
  const existing = await getContacts();
  const duplicate = existing.find((c) => normalizePhone(c.phone) === normalized);
  if (duplicate) return { error: 'המספר כבר קיים במערכת' };
  await createContact({ full_name: fullName.trim(), phone: normalized });
  revalidatePath('/anshei-kesher');
  return { success: true };
}
