'use client';

import * as React from 'react';
import type { Campaign } from '@/lib/airtable/types';
import { broadcastFromPageAction, type BroadcastTarget } from '@/app/kampanim/actions';

interface Props {
  campaigns: Campaign[];
  allInterestedCount: number;
  enrollmentCounts: Record<string, number>;
}

const TARGET_OPTIONS: { value: BroadcastTarget; label: (counts: TargetCounts) => string; needsCampaign: boolean }[] = [
  {
    value: 'enrolled_campaign',
    label: (c) => `נרשמות לקמפיין זה${c.enrolled !== null ? ` (${c.enrolled})` : ''}`,
    needsCampaign: true,
  },
  {
    value: 'interested_campaign',
    label: (c) => `מתעניינות לקמפיין זה${c.interestedCampaign !== null ? ` (${c.interestedCampaign})` : ' (?)'}`,
    needsCampaign: true,
  },
  {
    value: 'all_interested',
    label: (c) => `כל המתעניינות (${c.allInterested})`,
    needsCampaign: false,
  },
  {
    value: 'enrolled_and_interested_campaign',
    label: (c) => {
      const parts: string[] = [];
      if (c.enrolled !== null) parts.push(`${c.enrolled} נרשמות`);
      if (c.interestedCampaign !== null) parts.push(`${c.interestedCampaign} מתעניינות`);
      return `נרשמות + מתעניינות לקמפיין זה${parts.length ? ` (${parts.join(', ')})` : ''}`;
    },
    needsCampaign: true,
  },
  {
    value: 'enrolled_and_all_interested',
    label: (c) => {
      const enrolledPart = c.enrolled !== null ? ` ${c.enrolled} נרשמות +` : '';
      return `נרשמות לקמפיין זה + כל המתעניינות (${enrolledPart} ${c.allInterested} מתעניינות)`;
    },
    needsCampaign: true,
  },
];

interface TargetCounts {
  enrolled: number | null;
  interestedCampaign: number | null;
  allInterested: number;
}

export function BroadcastPageClient({ campaigns, allInterestedCount, enrollmentCounts }: Props) {
  const [selectedCampaignId, setSelectedCampaignId] = React.useState<string>('');
  const [target, setTarget] = React.useState<BroadcastTarget>('enrolled_campaign');
  const [message, setMessage] = React.useState('');
  const [confirm, setConfirm] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<{ queued: true } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId) ?? null;

  const counts: TargetCounts = {
    enrolled: selectedCampaignId ? (enrollmentCounts[selectedCampaignId] ?? 0) : null,
    interestedCampaign: null, // populated only after Airtable field added
    allInterested: allInterestedCount,
  };

  const currentOption = TARGET_OPTIONS.find((o) => o.value === target)!;
  const campaignRequired = currentOption.needsCampaign;

  async function handleSend() {
    setPending(true);
    setError(null);
    setResult(null);
    setConfirm(false);

    const res = await broadcastFromPageAction(
      message,
      target,
      campaignRequired ? selectedCampaignId : undefined,
      campaignRequired ? selectedCampaign?.campaign_name : undefined,
    );

    setPending(false);
    if ('error' in res) { setError(res.error); return; }
    setResult({ queued: true });
    setMessage('');
  }

  const canSend = message.trim().length > 0 && (!campaignRequired || selectedCampaignId !== '');

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-6 flex flex-col gap-6">

        <div>
          <h1 className="text-2xl font-bold">הודעות בשליחה מיידית</h1>
          <p className="text-sm text-muted-foreground mt-1">שליחת הודעת WhatsApp ידנית לקבוצת יעד</p>
        </div>

        <div className="rounded-xl border bg-card p-6 flex flex-col gap-5">

          {/* Target selection */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">יעד שליחה</p>
            <div className="flex flex-col gap-2">
              {TARGET_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="target"
                    value={opt.value}
                    checked={target === opt.value}
                    onChange={() => {
                      setTarget(opt.value);
                      setResult(null);
                      setError(null);
                    }}
                    disabled={pending}
                    className="accent-primary"
                  />
                  {opt.label(counts)}
                </label>
              ))}
            </div>
          </div>

          {/* Campaign dropdown — shown only when target requires campaign */}
          {campaignRequired && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold" htmlFor="campaign-select">קמפיין</label>
              <select
                id="campaign-select"
                value={selectedCampaignId}
                onChange={(e) => {
                  setSelectedCampaignId(e.target.value);
                  setResult(null);
                  setError(null);
                }}
                disabled={pending}
                className="rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                <option value="">בחרי קמפיין...</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.campaign_name}
                    {enrollmentCounts[c.id] !== undefined ? ` — ${enrollmentCounts[c.id]} נרשמות` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Message */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" htmlFor="message-input">תוכן ההודעה</label>
            <textarea
              id="message-input"
              rows={5}
              dir="rtl"
              placeholder="הקלידי את ההודעה..."
              value={message}
              onChange={(e) => { setMessage(e.target.value); setResult(null); setError(null); }}
              disabled={pending}
              className="w-full resize-none rounded-lg border px-3 py-2 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          </div>

          {/* Confirm box */}
          {confirm && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex flex-col gap-2">
              <p className="text-sm font-medium text-amber-800">לאשר שליחה?</p>
              <p className="text-xs text-amber-700">לא ניתן לבטל לאחר השליחה.</p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirm(false)}
                  className="rounded-lg border px-4 py-1.5 text-sm font-medium hover:bg-background"
                >
                  ביטול
                </button>
                <button
                  onClick={handleSend}
                  className="rounded-lg bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:bg-primary/90"
                >
                  אישור — שלחי
                </button>
              </div>
            </div>
          )}

          {/* Result / Error */}
          {result && (
            <p className="text-sm text-green-700">ההודעה נשלחה למייק לעיבוד</p>
          )}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Send button */}
          {!confirm && (
            <div className="flex justify-end">
              <button
                onClick={() => setConfirm(true)}
                disabled={!canSend || pending}
                className="rounded-lg bg-primary text-primary-foreground px-6 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending ? 'שולחת...' : 'שלחי'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
