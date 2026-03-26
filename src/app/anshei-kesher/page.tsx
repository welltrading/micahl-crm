import { getContacts } from '@/lib/airtable/contacts';
import { getCampaigns } from '@/lib/airtable/campaigns';
import { ContactsPageClient } from '@/components/contacts/ContactsPageClient';

// Force dynamic: contacts change via webhook, always fetch fresh data
export const dynamic = 'force-dynamic';

export default async function AnsheiKesherPage() {
  let contacts;
  let campaigns: import('@/lib/airtable/types').Campaign[] = [];
  try {
    const [rawContacts, fetchedCampaigns] = await Promise.all([
      getContacts(),
      getCampaigns(),
    ]);

    campaigns = fetchedCampaigns;
    const campaignNameMap: Record<string, string> = {};
    for (const c of campaigns) campaignNameMap[c.id] = c.campaign_name;

    contacts = rawContacts.map((c) => ({
      ...c,
      campaign_names: (c.campaign_ids ?? []).map((id) => campaignNameMap[id]).filter(Boolean),
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return (
      <div dir="rtl" className="p-6 text-red-600 text-sm">
        שגיאה בטעינת אנשי קשר: {message}
      </div>
    );
  }

  return <ContactsPageClient contacts={contacts} campaigns={campaigns} />;
}
