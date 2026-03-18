'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Campaign } from '@/lib/airtable/types';
import { Button } from '@/components/ui/button';
import { CampaignCard } from './CampaignCard';
import { CreateCampaignModal } from './CreateCampaignModal';

interface CampaignsPageClientProps {
  campaigns: Campaign[];
  enrollmentCounts: Record<string, number>;
}

export function CampaignsPageClient({ campaigns, enrollmentCounts }: CampaignsPageClientProps) {
  const router = useRouter();
  const [selectedCampaign, setSelectedCampaign] = React.useState<Campaign | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">קמפיינים</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>צור קמפיין</Button>
      </div>

      {/* Campaign grid or empty state */}
      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground text-lg">אין קמפיינים עדיין — צרי קמפיין ראשון</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              enrollmentCount={enrollmentCounts[campaign.id] ?? 0}
              onClick={() => setSelectedCampaign(campaign)}
            />
          ))}
        </div>
      )}

      {/* Create campaign modal */}
      <CreateCampaignModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCampaignCreated={(c) => {
          setSelectedCampaign(c);
          router.refresh();
        }}
      />

      {/* CampaignSheet placeholder — Plan 04 will fill this in */}
      {selectedCampaign !== null ? null : null}
    </div>
  );
}
