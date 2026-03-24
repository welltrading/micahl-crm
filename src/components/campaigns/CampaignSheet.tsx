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
  saveWelcomeMessageAction,
  deleteCampaignAction,
  broadcastAction,
  getCampaignLogAction,
  getEnrolleesAction,
  removeEnrollmentAction,
  type BroadcastTarget,
} from '@/app/kampanim/actions';
import { israelDateTimeToUTC, formatSendPreview } from '@/lib/timezone-client';
import { mapErrorToHebrew, type MessageLogDisplayEntry } from '@/lib/airtable/message-log-client';
import { formatPhoneDisplay } from '@/lib/airtable/phone';
import type { EnrolleeDisplayEntry } from '@/lib/airtable/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SlotState {
  title: string;
  date: string;    // YYYY-MM-DD (Israel local)
  time: string;    // HH:MM (Israel local)
  content: string;
  recordId?: string;
  status?: ScheduledMessage['status'];
}

const EMPTY_SLOT = (): SlotState => ({ title: '', date: '', time: '09:00', content: '' });

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: 'ממתין', className: 'bg-yellow-100 text-yellow-800' },
  sending: { label: 'נשלח כעת', className: 'bg-blue-100 text-blue-800' },
  sent:    { label: 'נשלח', className: 'bg-green-100 text-green-800' },
  failed:  { label: 'נכשל', className: 'bg-red-100 text-red-800' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEventDate(isoDate: string | undefined): string {
  if (!isoDate) return '';
  try {
    return new Date(isoDate).toLocaleDateString('he-IL', {
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
  onDelete?: (campaignId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CampaignSheet({ campaign, enrollmentCount = 0, onClose, onDelete }: CampaignSheetProps) {
  const [loading, setLoading] = React.useState(false);
  const [slotSaving, setSlotSaving] = React.useState<boolean[]>([false, false, false, false]);
  const [slotError, setSlotError] = React.useState<(string | null)[]>([null, null, null, null]);
  const [slotSuccess, setSlotSuccess] = React.useState<boolean[]>([false, false, false, false]);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // Broadcast state
  const [broadcastMessage, setBroadcastMessage] = React.useState('');
  const [broadcastTarget, setBroadcastTarget] = React.useState<BroadcastTarget>('enrolled_campaign');
  const [broadcastConfirm, setBroadcastConfirm] = React.useState(false);
  const [broadcastPending, setBroadcastPending] = React.useState(false);
  const [broadcastResult, setBroadcastResult] = React.useState<{ queued: true } | null>(null);
  const [broadcastError, setBroadcastError] = React.useState<string | null>(null);

  // Tab + log state
  const [activeTab, setActiveTab] = React.useState<'messages' | 'log' | 'enrollees'>('messages');
  const [logEntries, setLogEntries] = React.useState<MessageLogDisplayEntry[] | null>(null);
  const [logLoading, setLogLoading] = React.useState(false);
  const [logError, setLogError] = React.useState<string | null>(null);
  const [showFailuresOnly, setShowFailuresOnly] = React.useState(false);

  // Enrollees tab state
  const [enrolleeEntries, setEnrolleeEntries] = React.useState<EnrolleeDisplayEntry[] | null>(null);
  const [enrolleesLoading, setEnrolleesLoading] = React.useState(false);
  const [enrolleesError, setEnrolleesError] = React.useState<string | null>(null);
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const [slots, setSlots] = React.useState<SlotState[]>([
    EMPTY_SLOT(), EMPTY_SLOT(), EMPTY_SLOT(), EMPTY_SLOT(),
  ]);

  // Welcome message state
  const [welcomeTitle, setWelcomeTitle] = React.useState('');
  const [welcomeContent, setWelcomeContent] = React.useState('');
  const [welcomeSaving, setWelcomeSaving] = React.useState(false);
  const [welcomeError, setWelcomeError] = React.useState<string | null>(null);
  const [welcomeSuccess, setWelcomeSuccess] = React.useState(false);

  // Reset broadcast state when campaign changes
  React.useEffect(() => {
    setBroadcastMessage('');
    setBroadcastConfirm(false);
    setBroadcastPending(false);
    setBroadcastResult(null);
    setBroadcastError(null);
  }, [campaign?.id]);

  // Load welcome message from campaign record
  React.useEffect(() => {
    setWelcomeTitle(campaign?.welcome_message_title ?? '');
    setWelcomeContent(campaign?.welcome_message ?? '');
    setWelcomeError(null);
    setWelcomeSuccess(false);
  }, [campaign?.id]);

  // Reset log state when campaign changes (prevents stale data from previous campaign)
  React.useEffect(() => {
    setActiveTab('messages');
    setLogEntries(null);
    setLogError(null);
    setLogLoading(false);
    setShowFailuresOnly(false);
    setEnrolleeEntries(null);
    setEnrolleesError(null);
    setEnrolleesLoading(false);
    setRemovingId(null);
  }, [campaign?.id]);

  // Load saved messages when campaign changes
  React.useEffect(() => {
    if (!campaign) {
      setSlots([EMPTY_SLOT(), EMPTY_SLOT(), EMPTY_SLOT(), EMPTY_SLOT()]);
      setSlotError([null, null, null, null]);
      setSlotSuccess([false, false, false, false]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setSlotError([null, null, null, null]);
    setSlotSuccess([false, false, false, false]);

    getCampaignMessagesAction(campaign.id).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if ('error' in result) { setDeleteError(result.error); return; }

      const next: SlotState[] = [EMPTY_SLOT(), EMPTY_SLOT(), EMPTY_SLOT(), EMPTY_SLOT()];
      for (const msg of result.messages) {
        const i = msg.slot_index - 1;
        if (i < 0 || i > 3) continue;
        next[i] = {
          title: msg.title ?? '',
          date: msg.send_date ?? '',
          time: msg.send_time ?? '09:00',
          content: msg.message_content ?? '',
          recordId: msg.id,
          status: msg.status,
        };
      }
      setSlots(next);
    });

    return () => { cancelled = true; };
  }, [campaign?.id]);

  // Lazy-load log entries when log tab first opened
  React.useEffect(() => {
    if (activeTab !== 'log' || !campaign) return;
    if (logEntries !== null) return;
    let cancelled = false;
    setLogLoading(true);
    getCampaignLogAction(campaign.id).then((result) => {
      if (cancelled) return;
      setLogLoading(false);
      if ('error' in result) { setLogError(result.error); return; }
      setLogEntries(result.entries);
    });
    return () => { cancelled = true; };
  }, [activeTab, campaign?.id]);

  // Lazy-load enrollees when enrollees tab first opened
  React.useEffect(() => {
    if (activeTab !== 'enrollees' || !campaign) return;
    if (enrolleeEntries !== null) return;
    let cancelled = false;
    setEnrolleesLoading(true);
    getEnrolleesAction(campaign.id).then((result) => {
      if (cancelled) return;
      setEnrolleesLoading(false);
      if ('error' in result) { setEnrolleesError(result.error); return; }
      setEnrolleeEntries(result.enrollees);
    });
    return () => { cancelled = true; };
  }, [activeTab, campaign?.id]);

  // ---------------------------------------------------------------------------
  // Slot updater
  // ---------------------------------------------------------------------------
  function updateSlot(i: number, patch: Partial<SlotState>) {
    setSlots((prev) => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  }

  // ---------------------------------------------------------------------------
  // Save single slot
  // ---------------------------------------------------------------------------
  async function handleSaveSlot(i: number) {
    if (!campaign) return;
    const slot = slots[i];

    if (slot.content.trim() === '') {
      setSlotError((prev) => prev.map((e, idx) => idx === i ? 'יש למלא תוכן הודעה.' : e));
      return;
    }
    if (slot.date === '') {
      setSlotError((prev) => prev.map((e, idx) => idx === i ? 'יש לבחור תאריך שליחה.' : e));
      return;
    }

    setSlotSaving((prev) => prev.map((v, idx) => idx === i ? true : v));
    setSlotError((prev) => prev.map((e, idx) => idx === i ? null : e));
    setSlotSuccess((prev) => prev.map((v, idx) => idx === i ? false : v));

    const slotData: SlotData = {
      slot_index: i + 1,
      recordId: slot.recordId,
      title: slot.title,
      message_content: slot.content,
      send_date: slot.date,
      send_time: slot.time,
    };

    const result = await saveMessagesAction(campaign.id, [slotData]);
    setSlotSaving((prev) => prev.map((v, idx) => idx === i ? false : v));

    if ('error' in result) {
      setSlotError((prev) => prev.map((e, idx) => idx === i ? result.error : e));
      return;
    }

    setSlotSuccess((prev) => prev.map((v, idx) => idx === i ? true : v));
    setTimeout(() => setSlotSuccess((prev) => prev.map((v, idx) => idx === i ? false : v)), 3000);

    // Store the recordId returned from the save (works for both create and update)
    const saved = result.savedSlots.find((s) => s.slot_index === i + 1);
    if (saved) updateSlot(i, { recordId: saved.recordId });
  }

  // ---------------------------------------------------------------------------
  // Welcome message save
  // ---------------------------------------------------------------------------
  async function handleSaveWelcome() {
    if (!campaign) return;
    setWelcomeError(null);
    setWelcomeSaving(true);
    setWelcomeSuccess(false);
    const result = await saveWelcomeMessageAction(campaign.id, welcomeTitle, welcomeContent);
    setWelcomeSaving(false);
    if ('error' in result) { setWelcomeError(result.error); return; }
    setWelcomeSuccess(true);
    setTimeout(() => setWelcomeSuccess(false), 3000);
  }

  // ---------------------------------------------------------------------------
  // Broadcast
  // ---------------------------------------------------------------------------
  async function handleBroadcastConfirm() {
    if (!campaign) return;
    setBroadcastPending(true);
    setBroadcastError(null);
    setBroadcastResult(null);
    setBroadcastConfirm(false);

    const result = await broadcastAction(campaign.id, campaign.campaign_name, broadcastMessage, broadcastTarget);
    setBroadcastPending(false);

    if ('error' in result) {
      setBroadcastError(result.error);
      return;
    }

    setBroadcastResult({ queued: true });
    setBroadcastMessage('');
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  async function handleDelete() {
    if (!campaign) return;
    if (!confirm(`למחוק את הקמפיין "${campaign.campaign_name}"? פעולה זו אינה הפיכה.`)) return;
    setDeleting(true);
    const result = await deleteCampaignAction(campaign.id);
    setDeleting(false);
    if ('error' in result) { setDeleteError(result.error); return; }
    onDelete?.(campaign.id);
    onClose();
  }

  // ---------------------------------------------------------------------------
  // Unenroll
  // ---------------------------------------------------------------------------
  async function handleRemove(enrollmentId: string) {
    if (!window.confirm('לבטל את הרישום? פעולה זו אינה הפיכה.')) return;
    setRemovingId(enrollmentId);
    const result = await removeEnrollmentAction(enrollmentId);
    setRemovingId(null);
    if ('error' in result) {
      setEnrolleesError(result.error);
      return;
    }
    setEnrolleeEntries((prev) => prev?.filter((e) => e.enrollment_id !== enrollmentId) ?? null);
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

        {/* Tab navigation */}
        <div className="flex gap-1 border-b pb-0 px-4 pt-2">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'messages' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('messages')}
          >
            הודעות
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'log' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('log')}
          >
            יומן שליחות
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'enrollees' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('enrollees')}
          >
            נרשמות
          </button>
        </div>

        {/* Messages tab */}
        {activeTab === 'messages' && (
          <>
            <div className="flex flex-col gap-6 p-4">
              {loading && (
                <p className="text-sm text-muted-foreground text-center py-4">טוען הודעות...</p>
              )}

              {/* Welcome message */}
            <div className="flex flex-col gap-2 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
              <span className="text-xs font-semibold text-blue-800">הודעת ברוכה הבאה</span>
              <p className="text-xs text-muted-foreground">נשלחת לנרשמת עם ההרשמה לקמפיין</p>
              <input
                type="text"
                dir="rtl"
                placeholder="כותרת (אופציונלי)"
                value={welcomeTitle}
                onChange={(e) => { setWelcomeTitle(e.target.value); setWelcomeError(null); }}
                className="w-full rounded-md border px-3 py-1.5 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <textarea
                rows={3}
                dir="rtl"
                placeholder="תוכן ההודעה..."
                value={welcomeContent}
                onChange={(e) => { setWelcomeContent(e.target.value); setWelcomeError(null); }}
                className="w-full resize-none rounded-md border px-3 py-2 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {welcomeError && <p className="text-xs text-red-600">{welcomeError}</p>}
              {welcomeSuccess && <p className="text-xs text-green-600">✓ נשמר</p>}
              <button
                onClick={handleSaveWelcome}
                disabled={welcomeSaving || loading}
                className="self-end rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {welcomeSaving ? 'שומר...' : 'שמור הודעה'}
              </button>
            </div>

            {!loading && slots.map((slot, i) => {
                const preview = slot.date && slot.time
                  ? formatSendPreview(israelDateTimeToUTC(slot.date, slot.time))
                  : '';

                return (
                  <div key={i} className="flex flex-col gap-2 rounded-lg border p-3">
                    {/* Slot header */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">הודעה {i + 1}</span>
                      {slot.status && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[slot.status]?.className ?? ''}`}>
                          {STATUS_BADGE[slot.status]?.label ?? slot.status}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <input
                      type="text"
                      dir="rtl"
                      placeholder="כותרת (למשל: הזמנה ראשונית)"
                      value={slot.title}
                      onChange={(e) => updateSlot(i, { title: e.target.value })}
                      className="w-full rounded-md border px-3 py-1.5 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />

                    {/* Date + Time row */}
                    <div className="flex gap-2 items-center">
                      <input
                        type="date"
                        value={slot.date}
                        dir="ltr"
                        onChange={(e) => updateSlot(i, { date: e.target.value })}
                        className="flex-1 rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <select
                        value={slot.time}
                        onChange={(e) => updateSlot(i, { time: e.target.value })}
                        className="rounded-md border px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {/* Send preview */}
                    {preview && (
                      <p className="text-xs text-muted-foreground">{preview}</p>
                    )}

                    {/* Message content */}
                    <textarea
                      rows={3}
                      dir="rtl"
                      placeholder="תוכן ההודעה..."
                      value={slot.content}
                      onChange={(e) => updateSlot(i, { content: e.target.value })}
                      className="w-full resize-none rounded-md border px-3 py-2 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />

                    {/* Per-slot feedback */}
                    {slotError[i] && (
                      <p className="text-xs text-red-600">{slotError[i]}</p>
                    )}
                    {slotSuccess[i] && (
                      <p className="text-xs text-green-600">✓ נשמר</p>
                    )}

                    {/* Per-slot save button */}
                    <button
                      onClick={() => handleSaveSlot(i)}
                      disabled={slotSaving[i] || loading}
                      className="self-end rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {slotSaving[i] ? 'שומר...' : 'שמור הודעה'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Broadcast section */}
            <div className="border-t pt-4 px-4 pb-2 flex flex-col gap-3">
              <h3 className="text-sm font-semibold">שליחת broadcast</h3>

              {/* Target selection */}
              <div className="flex flex-col gap-1.5">
                {(
                  [
                    { value: 'enrolled_campaign',                label: `נרשמות (${enrollmentCount})` },
                    { value: 'interested_campaign',              label: 'מתעניינות לקמפיין זה (?)' },
                    { value: 'all_interested',                   label: 'כל המתעניינות' },
                    { value: 'enrolled_and_interested_campaign', label: 'נרשמות + מתעניינות לקמפיין זה' },
                    { value: 'enrolled_and_all_interested',      label: 'נרשמות + כל המתעניינות' },
                  ] as { value: BroadcastTarget; label: string }[]
                ).map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="broadcastTarget"
                      value={value}
                      checked={broadcastTarget === value}
                      onChange={() => { setBroadcastTarget(value); setBroadcastResult(null); setBroadcastError(null); }}
                      disabled={broadcastPending}
                      className="accent-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>

              <textarea
                rows={3}
                dir="rtl"
                placeholder="הקלידי את תוכן ההודעה..."
                value={broadcastMessage}
                onChange={(e) => {
                  setBroadcastMessage(e.target.value);
                  setBroadcastResult(null);
                  setBroadcastError(null);
                }}
                disabled={broadcastPending}
                className="w-full resize-none rounded-md border px-3 py-2 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />

              {!broadcastConfirm ? (
                <button
                  onClick={() => setBroadcastConfirm(true)}
                  disabled={!broadcastMessage.trim() || broadcastPending}
                  className="self-end rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {broadcastPending ? 'שולח...' : 'שלח'}
                </button>
              ) : (
                <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-medium text-amber-800">לאשר שליחה?</p>
                  <p className="text-xs text-amber-700">לא ניתן לבטל לאחר השליחה.</p>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setBroadcastConfirm(false)}
                      className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-background"
                    >
                      ביטול
                    </button>
                    <button
                      onClick={handleBroadcastConfirm}
                      className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90"
                    >
                      אישור — שלח
                    </button>
                  </div>
                </div>
              )}

              {broadcastResult && (
                <p className="text-sm text-green-700">
                  ההודעה נשלחה למייק לעיבוד
                </p>
              )}

              {broadcastError && (
                <p className="text-sm text-red-600">{broadcastError}</p>
              )}
            </div>
          </>
        )}

        {/* Log tab */}
        {activeTab === 'log' && (
          <div className="flex flex-col gap-4 p-4">
            {/* Loading state */}
            {logLoading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                טוענת יומן שליחות...
              </div>
            )}

            {/* Error state */}
            {logError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {logError}
              </div>
            )}

            {/* Log content */}
            {logEntries !== null && !logLoading && (
              <>
                {/* Failures toggle */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showFailuresOnly}
                      onChange={(e) => setShowFailuresOnly(e.target.checked)}
                      className="h-4 w-4"
                    />
                    רק כשלונות
                  </label>
                  <span className="text-xs text-muted-foreground">
                    ({(showFailuresOnly ? logEntries.filter(e => e.status === 'failed') : logEntries).length} רשומות)
                  </span>
                </div>

                {/* Empty state */}
                {logEntries.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                    אין רשומות יומן עדיין לקמפיין זה
                  </div>
                ) : (
                  /* Log table */
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="pb-2 text-right font-medium pe-3">שם מלא</th>
                          <th className="pb-2 text-right font-medium pe-3">טלפון</th>
                          <th className="pb-2 text-right font-medium pe-3">סטטוס</th>
                          <th className="pb-2 text-right font-medium pe-3">זמן שליחה</th>
                          <th className="pb-2 text-right font-medium">סיבת שגיאה</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(showFailuresOnly ? logEntries.filter(e => e.status === 'failed') : logEntries).map((entry) => (
                          <tr key={entry.id} className="border-b last:border-0">
                            <td className="py-2 pe-3">{entry.full_name ?? '—'}</td>
                            <td className="py-2 pe-3" dir="ltr">
                              {entry.phone ? formatPhoneDisplay(entry.phone) : '—'}
                            </td>
                            <td className="py-2 pe-3">
                              {STATUS_BADGE[entry.status] ? (
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[entry.status].className}`}>
                                  {STATUS_BADGE[entry.status].label}
                                </span>
                              ) : entry.status}
                            </td>
                            <td className="py-2 pe-3 text-muted-foreground tabular-nums" dir="ltr">
                              {entry.logged_at
                                ? new Date(entry.logged_at).toLocaleString('he-IL', {
                                    timeZone: 'Asia/Jerusalem',
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '—'}
                            </td>
                            <td className="py-2 text-red-600 text-xs max-w-[200px]">
                              {entry.error_message ? mapErrorToHebrew(entry.error_message) : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Enrollees tab */}
        {activeTab === 'enrollees' && (
          <div className="mt-4 px-4">
            {enrolleesLoading && (
              <p className="text-sm text-muted-foreground text-center py-8">טוענת נרשמות...</p>
            )}
            {enrolleesError && (
              <p className="text-sm text-red-600 text-center py-4">{enrolleesError}</p>
            )}
            {!enrolleesLoading && !enrolleesError && enrolleeEntries !== null && enrolleeEntries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">אין נרשמות לקמפיין זה</p>
            )}
            {!enrolleesLoading && !enrolleesError && enrolleeEntries && enrolleeEntries.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="pb-2 text-right font-medium pe-3">שם מלא</th>
                      <th className="pb-2 text-right font-medium pe-3">טלפון</th>
                      <th className="pb-2 text-right font-medium pe-3">אימייל</th>
                      <th className="pb-2 text-right font-medium">ביטול רישום</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolleeEntries.map((entry) => (
                      <tr key={entry.enrollment_id} className="border-b last:border-0">
                        <td className="py-2 pe-3">{entry.full_name}</td>
                        <td className="py-2 pe-3" dir="ltr">
                          {entry.phone ? formatPhoneDisplay(entry.phone) : '—'}
                        </td>
                        <td className="py-2 pe-3">{entry.email ?? '—'}</td>
                        <td className="py-2">
                          <button
                            onClick={() => handleRemove(entry.enrollment_id)}
                            disabled={removingId === entry.enrollment_id}
                            className="rounded-md border border-red-200 text-red-600 px-2 py-1 text-xs hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {removingId === entry.enrollment_id ? 'מבטל...' : 'בטל רישום'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Sticky footer */}
        <div className="sticky bottom-0 border-t bg-background p-4 flex flex-col gap-2">
          {deleteError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
              {deleteError}
            </div>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting || slotSaving.some(Boolean)}
            className="w-full rounded-md border border-red-200 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? 'מוחק...' : 'מחק קמפיין'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
