'use client';

import * as React from 'react';
import type { Campaign, ScheduledMessage } from '@/lib/airtable/types';
import type { SlotData } from '@/lib/airtable/scheduled-messages';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  getCampaignMessagesAction,
  saveMessagesAction,
} from '@/app/kampanim/actions';
import {
  computeSendAt,
  formatSendPreview,
  computeHalfHourTime,
} from '@/lib/timezone-client';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type OffsetLabel = 'week_before' | 'day_before' | 'morning' | 'half_hour';

interface SlotDef {
  key: OffsetLabel;
  label: string;
  hasTimePicker: boolean;
}

const SLOTS: SlotDef[] = [
  { key: 'week_before', label: 'שבוע לפני', hasTimePicker: false },
  { key: 'day_before',  label: 'יום לפני',  hasTimePicker: false },
  { key: 'morning',     label: 'בוקר האירוע', hasTimePicker: true },
  { key: 'half_hour',  label: 'חצי שעה לפני', hasTimePicker: false },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

const STATUS_BADGE: Record<ScheduledMessage['status'], { label: string; className: string }> = {
  pending: { label: 'ממתין', className: 'bg-yellow-100 text-yellow-800' },
  sending: { label: 'נשלח כעת', className: 'bg-blue-100 text-blue-800' },
  sent:    { label: 'נשלח', className: 'bg-green-100 text-green-800' },
  failed:  { label: 'נכשל', className: 'bg-red-100 text-red-800' },
};

type SlotContentMap = Record<OffsetLabel, string>;
type SlotMessageMap = Record<OffsetLabel, ScheduledMessage | null>;

const EMPTY_SLOT_CONTENT: SlotContentMap = {
  week_before: '',
  day_before: '',
  morning: '',
  half_hour: '',
};

const EMPTY_SLOT_MESSAGES: SlotMessageMap = {
  week_before: null,
  day_before: null,
  morning: null,
  half_hour: null,
};

// ---------------------------------------------------------------------------
// Utility: format campaign event date for display
// ---------------------------------------------------------------------------
function formatEventDate(isoDate: string | undefined): string {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface CampaignSheetProps {
  campaign: Campaign | null;
  enrollmentCount?: number;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function CampaignSheet({ campaign, enrollmentCount = 0, onClose }: CampaignSheetProps) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [slotContent, setSlotContent] = React.useState<SlotContentMap>(EMPTY_SLOT_CONTENT);
  const [morningTime, setMorningTime] = React.useState('09:00');
  const [slotMessages, setSlotMessages] = React.useState<SlotMessageMap>(EMPTY_SLOT_MESSAGES);

  // Lazy-load messages when campaign changes
  React.useEffect(() => {
    if (!campaign) {
      setSlotContent(EMPTY_SLOT_CONTENT);
      setSlotMessages(EMPTY_SLOT_MESSAGES);
      setMorningTime('09:00');
      setSaveSuccess(false);
      setSaveError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setSaveSuccess(false);
    setSaveError(null);

    getCampaignMessagesAction(campaign.id).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if ('error' in result) {
        setSaveError(result.error);
        return;
      }

      const newContent: SlotContentMap = { ...EMPTY_SLOT_CONTENT };
      const newMessages: SlotMessageMap = { ...EMPTY_SLOT_MESSAGES };
      let foundMorningTime = '09:00';

      for (const msg of result.messages) {
        const label = msg.offset_label;
        newContent[label] = msg.message_content ?? '';
        newMessages[label] = msg;

        // Restore morning time from saved send_at (convert UTC back to Jerusalem HH:MM)
        if (label === 'morning' && msg.send_at) {
          const d = new Date(msg.send_at);
          const fmt = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Jerusalem',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
          const parts = fmt.formatToParts(d);
          const hh = parts.find((p) => p.type === 'hour')?.value ?? '09';
          const mm = parts.find((p) => p.type === 'minute')?.value ?? '00';
          foundMorningTime = `${hh}:${mm}`;
        }
      }

      setSlotContent(newContent);
      setSlotMessages(newMessages);
      setMorningTime(foundMorningTime);
    });

    return () => {
      cancelled = true;
    };
  }, [campaign?.id]);

  // ---------------------------------------------------------------------------
  // Derived: send preview per slot
  // ---------------------------------------------------------------------------
  const getSendPreview = React.useCallback(
    (slotKey: OffsetLabel): string => {
      if (!campaign?.event_date || !campaign?.event_time) return '';
      const eventDate = campaign.event_date.slice(0, 10); // YYYY-MM-DD
      const eventTime = campaign.event_time;
      try {
        const utc = computeSendAt(eventDate, eventTime, slotKey, morningTime);
        return formatSendPreview(utc);
      } catch {
        return '';
      }
    },
    [campaign?.event_date, campaign?.event_time, morningTime]
  );

  // ---------------------------------------------------------------------------
  // Save handler
  // ---------------------------------------------------------------------------
  async function handleSave() {
    if (!campaign) return;
    if (!campaign.event_date || !campaign.event_time) {
      setSaveError('חסר תאריך או שעת האירוע — לא ניתן לחשב זמני שליחה');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const eventDate = campaign.event_date.slice(0, 10);
    const eventTime = campaign.event_time;

    const slots: SlotData[] = SLOTS.filter(
      (s) => slotContent[s.key].trim() !== ''
    ).map((s) => ({
      offset_label: s.key,
      message_content: slotContent[s.key],
      send_at: computeSendAt(
        eventDate,
        eventTime,
        s.key,
        s.key === 'morning' ? morningTime : undefined
      ),
    }));

    const result = await saveMessagesAction(campaign.id, slots);
    setSaving(false);

    if ('error' in result) {
      setSaveError(result.error);
      return;
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);

    // Reload messages after save
    const refreshResult = await getCampaignMessagesAction(campaign.id);
    if (!('error' in refreshResult)) {
      const newMessages: SlotMessageMap = { ...EMPTY_SLOT_MESSAGES };
      for (const msg of refreshResult.messages) {
        newMessages[msg.offset_label] = msg;
      }
      setSlotMessages(newMessages);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const isOpen = campaign !== null;

  return (
    <Sheet open={isOpen} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <SheetContent side="left" dir="rtl" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="text-xl">{campaign?.campaign_name ?? ''}</SheetTitle>
          {campaign && (
            <div className="flex flex-col gap-1 mt-1">
              <p className="text-sm text-muted-foreground">
                {formatEventDate(campaign.event_date)}
                {campaign.event_time ? ` בשעה ${campaign.event_time}` : ''}
              </p>
              {campaign.description && (
                <p className="text-sm text-muted-foreground">{campaign.description}</p>
              )}
              <p className="text-sm font-medium">{enrollmentCount} נרשמות</p>
            </div>
          )}
        </SheetHeader>

        <div className="flex flex-col gap-6 p-4">
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-4">טוען הודעות...</p>
          )}

          {!loading && campaign && !campaign.event_time && (
            <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
              שעת האירוע חסרה — לא ניתן לחשב זמני שליחה. ערכי את הקמפיין והוסיפי שעה.
            </div>
          )}

          {!loading && SLOTS.map((slot) => {
            const msg = slotMessages[slot.key];
            const preview = getSendPreview(slot.key);
            const halfHourTime = campaign?.event_time
              ? computeHalfHourTime(campaign.event_time)
              : null;

            return (
              <div key={slot.key} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{slot.label}</h3>
                  {msg && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[msg.status]?.className ?? ''}`}
                    >
                      {STATUS_BADGE[msg.status]?.label ?? msg.status}
                    </span>
                  )}
                </div>

                {/* Time picker for morning slot */}
                {slot.key === 'morning' && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">שעת שליחה:</label>
                    <select
                      value={morningTime}
                      onChange={(e) => setMorningTime(e.target.value)}
                      className="text-sm border rounded px-2 py-1 bg-background"
                      disabled={msg?.status === 'sent' || msg?.status === 'sending'}
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Read-only computed time for half_hour slot */}
                {slot.key === 'half_hour' && halfHourTime && (
                  <p className="text-xs text-muted-foreground">
                    זמן: {halfHourTime} (30 דקות לפני האירוע)
                  </p>
                )}

                <textarea
                  rows={3}
                  dir="rtl"
                  placeholder="תוכן ההודעה..."
                  value={slotContent[slot.key]}
                  onChange={(e) =>
                    setSlotContent((prev) => ({ ...prev, [slot.key]: e.target.value }))
                  }
                  disabled={msg?.status === 'sent' || msg?.status === 'sending'}
                  className="w-full resize-none rounded-md border px-3 py-2 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                />

                {preview && (
                  <p className="text-xs text-muted-foreground">{preview}</p>
                )}
              </div>
            );
          })}

          {/* Save feedback */}
          {saveError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
              נשמר בהצלחה
            </div>
          )}
        </div>

        {/* Footer: save button */}
        <div className="sticky bottom-0 border-t bg-background p-4">
          <button
            onClick={handleSave}
            disabled={saving || loading || !campaign}
            className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'שומר...' : 'שמור הודעות'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
