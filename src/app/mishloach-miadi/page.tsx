import { getCampaigns } from '@/lib/airtable/campaigns';
import { getInterestedCount } from '@/lib/airtable/campaigns';
import { getEnrollmentCountsByCampaign } from '@/lib/airtable/campaigns';
import { BroadcastPageClient } from '@/components/broadcast/BroadcastPageClient';

export const dynamic = 'force-dynamic';

export default async function MishloachMiadiPage() {
  const [campaigns, allInterestedCount, enrollmentCounts] = await Promise.all([
    getCampaigns(),
    getInterestedCount(),
    getEnrollmentCountsByCampaign(),
  ]);

  return (
    <BroadcastPageClient
      campaigns={campaigns}
      allInterestedCount={allInterestedCount}
      enrollmentCounts={enrollmentCounts}
    />
  );
}
