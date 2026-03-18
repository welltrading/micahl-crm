import { airtableBase } from './client';
import type { Contact } from './types';

// Airtable field names are Hebrew (as set up in Plan 02 schema)
// API field name = Hebrew display name in this project

export async function getContacts(): Promise<Contact[]> {
  const records = await airtableBase('Contacts')
    .select({
      sort: [{ field: 'נוצר בתאריך', direction: 'desc' }],
    })
    .all();

  return records.map((r) => ({
    id: r.id,
    full_name: r.fields['שם מלא'] as string,
    phone: r.fields['טלפון'] as string,
    joined_date: r.fields['תאריך הצטרפות'] as string | undefined,
    notes: r.fields['הערות'] as string | undefined,
    created_at: r.fields['נוצר בתאריך'] as string,
  }));
}

export async function getContactById(id: string): Promise<Contact | null> {
  try {
    const record = await airtableBase('Contacts').find(id);
    return {
      id: record.id,
      full_name: record.fields['שם מלא'] as string,
      phone: record.fields['טלפון'] as string,
      joined_date: record.fields['תאריך הצטרפות'] as string | undefined,
      notes: record.fields['הערות'] as string | undefined,
      created_at: record.fields['נוצר בתאריך'] as string,
    };
  } catch {
    return null;
  }
}
