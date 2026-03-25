import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { getCampaigns, getInterestedCount, getEnrollmentCountsByCampaign, getInterestedCountsAllCampaigns } from "@/lib/airtable/campaigns";
import { getGreenApiState } from "@/lib/airtable/green-api";
import { getMessagesSentThisMonth, getMessageLogSentCountsByCampaign } from "@/lib/airtable/message-log";

export const dynamic = 'force-dynamic';

const CAMPAIGN_STATUS_BADGE: Record<'future' | 'active' | 'ended', string> = {
  future: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  ended: 'bg-gray-100 text-gray-700',
};

const CAMPAIGN_STATUS_LABEL: Record<'future' | 'active' | 'ended', string> = {
  future: 'עתידי',
  active: 'פעיל',
  ended: 'הסתיים',
};

function conversionRate(enrolled: number, interested: number | undefined): string {
  if (!interested) return '—';
  return `${Math.round((enrolled / interested) * 100)}%`;
}

export default async function Home() {
  const [
    campaigns,
    greenApiState,
    interestedCountGlobal,
    enrollmentCounts,
    interestedCountsMap,
    messagesSentThisMonth,
    sentCountsByCampaign,
  ] = await Promise.all([
    getCampaigns(),
    getGreenApiState(),
    getInterestedCount(),
    getEnrollmentCountsByCampaign(),
    getInterestedCountsAllCampaigns(),
    getMessagesSentThisMonth(),
    getMessageLogSentCountsByCampaign(),
  ]);

  const activeCampaigns = campaigns.filter((c) => c.status === 'active' || c.status === 'future').length;
  const totalEnrollments = Object.values(enrollmentCounts).reduce((sum, n) => sum + n, 0);

  const isConnected = greenApiState === 'authorized';
  const isUnknown = greenApiState === 'unknown';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ברוכה הבאה, מיכל</h1>

      {/* 4 Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              קמפיינים פעילים/עתידיים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeCampaigns}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              נרשמות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalEnrollments}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              מתעניינות פעילות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{interestedCountGlobal}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              הודעות שנשלחו החודש
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{messagesSentThisMonth}</p>
          </CardContent>
        </Card>
      </div>

      {/* GREEN API badge */}
      <Card>
        <CardContent className="flex items-center gap-2 pt-6">
          <div
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              isUnknown ? 'bg-gray-400' : isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-sm font-medium">
            {`GREEN API: ${isUnknown ? 'סטטוס לא ידוע' : isConnected ? 'מחובר' : 'מנותק'}`}
          </span>
        </CardContent>
      </Card>

      {/* Campaign grid */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">קמפיינים</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => {
            const enrolled = enrollmentCounts[campaign.id] ?? 0;
            const interested = interestedCountsMap[campaign.id];
            const sent = sentCountsByCampaign[campaign.id] ?? 0;
            const eventDate = campaign.event_date
              ? new Date(campaign.event_date).toLocaleDateString('he-IL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'Asia/Jerusalem',
                })
              : '—';

            return (
              <Link key={campaign.id} href={`/kampanim/${campaign.id}`} className="block hover:opacity-80 transition-opacity">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {campaign.campaign_name}
                    </CardTitle>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${CAMPAIGN_STATUS_BADGE[campaign.status]}`}
                    >
                      {CAMPAIGN_STATUS_LABEL[campaign.status]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{eventDate}</p>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>נרשמות: {enrolled} | מתעניינות: {interested ?? 0}</p>
                  <p>% המרה: {conversionRate(enrolled, interested)}</p>
                  <p>הודעות שנשלחו: {sent}</p>
                </CardContent>
              </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Charts */}
      <DashboardCharts
        campaigns={campaigns}
        interestedCountsMap={interestedCountsMap}
        enrollmentCounts={enrollmentCounts}
        sentCountsByCampaign={sentCountsByCampaign}
      />
    </div>
  );
}
