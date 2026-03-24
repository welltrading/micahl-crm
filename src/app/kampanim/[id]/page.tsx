import { notFound } from 'next/navigation';
import { getCampaignById, getEnrollmentCountsByCampaign, getInterestedCount } from '@/lib/airtable/campaigns';
import { CampaignPageClient } from '@/components/campaigns/CampaignPageClient';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CampaignPage({ params }: Props) {
  const { id } = await params;

  const [campaign, enrollmentCounts, allInterestedCount] = await Promise.all([
    getCampaignById(id),
    getEnrollmentCountsByCampaign(),
    getInterestedCount(),
  ]);

  if (!campaign) notFound();

  return (
    <CampaignPageClient
      campaign={campaign}
      enrollmentCount={enrollmentCounts[id] ?? 0}
      allInterestedCount={allInterestedCount}
    />
  );
}
