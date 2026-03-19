import { getCampaigns, getEnrollmentCountsByCampaign } from '@/lib/airtable/campaigns';
import { getGreenApiState } from '@/lib/airtable/green-api';
import { CampaignsPageClient } from '@/components/campaigns/CampaignsPageClient';

export const dynamic = 'force-dynamic';

export default async function KampaninPage() {
  const [campaigns, enrollmentCounts, greenApiState] = await Promise.all([
    getCampaigns(),
    getEnrollmentCountsByCampaign(),
    getGreenApiState(),
  ]);

  return <CampaignsPageClient campaigns={campaigns} enrollmentCounts={enrollmentCounts} greenApiState={greenApiState} />;
}
