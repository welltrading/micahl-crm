import { getCampaigns, getEnrollmentCountsByCampaign } from '@/lib/airtable/campaigns';
import { CampaignsPageClient } from '@/components/campaigns/CampaignsPageClient';

export const dynamic = 'force-dynamic';

export default async function KampaninPage() {
  const [campaigns, enrollmentCounts] = await Promise.all([
    getCampaigns(),
    getEnrollmentCountsByCampaign(),
  ]);

  return <CampaignsPageClient campaigns={campaigns} enrollmentCounts={enrollmentCounts} />;
}
