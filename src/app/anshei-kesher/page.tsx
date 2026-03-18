import { getContacts } from '@/lib/airtable/contacts';
import { ContactsPageClient } from '@/components/contacts/ContactsPageClient';

// Force dynamic: contacts change via webhook, always fetch fresh data
export const dynamic = 'force-dynamic';

export default async function AnsheiKesherPage() {
  const contacts = await getContacts();

  return <ContactsPageClient contacts={contacts} />;
}
