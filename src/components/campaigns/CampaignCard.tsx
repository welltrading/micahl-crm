'use client';

import * as React from 'react';
import type { Campaign } from '@/lib/airtable/types';
import { Card, CardContent } from '@/components/ui/card';

interface CampaignCardProps {
  campaign: Campaign;
  enrollmentCount: number;
  onClick: () => void;
}

const CAMPAIGN_STATUS_BADGE: Record<Campaign['status'], string> = {
  future: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  ended: 'bg-gray-100 text-gray-700',
};

const CAMPAIGN_STATUS_LABEL: Record<Campaign['status'], string> = {
  future: 'עתידי',
  active: 'פעיל',
  ended: 'הסתיים',
};

function formatIsraeliDate(dateISO: string): string {
  try {
    const date = new Date(dateISO);
    return date.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jerusalem',
    });
  } catch {
    return dateISO;
  }
}

export function CampaignCard({ campaign, enrollmentCount, onClick }: CampaignCardProps) {
  const truncatedDescription =
    campaign.description && campaign.description.length > 80
      ? campaign.description.slice(0, 80) + '...'
      : campaign.description;

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="p-5 flex flex-col gap-3">
        {/* Name + status badge */}
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold leading-snug">{campaign.campaign_name}</h2>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${CAMPAIGN_STATUS_BADGE[campaign.status]}`}
          >
            {CAMPAIGN_STATUS_LABEL[campaign.status]}
          </span>
        </div>

        {/* Event date */}
        <p className="text-sm text-muted-foreground">{formatIsraeliDate(campaign.event_date)}</p>

        {/* Enrollment count */}
        <p className="text-sm font-medium">
          {enrollmentCount} נרשמות
        </p>

        {/* Description */}
        {truncatedDescription && (
          <p className="text-sm text-muted-foreground leading-relaxed">{truncatedDescription}</p>
        )}
      </CardContent>
    </Card>
  );
}
