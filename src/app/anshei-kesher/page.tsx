import { getContacts } from '@/lib/airtable/contacts';
import { ContactsPageClient } from '@/components/contacts/ContactsPageClient';

// Force dynamic: contacts change via webhook, always fetch fresh data
export const dynamic = 'force-dynamic';

export default async function AnsheiKesherPage() {
  let contacts;
  try {
    contacts = await getContacts();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return (
      <div dir="rtl" className="p-6 text-red-600 text-sm">
        שגיאה בטעינת אנשי קשר: {message}
      </div>
    );
  }

  return <ContactsPageClient contacts={contacts} />;
}
