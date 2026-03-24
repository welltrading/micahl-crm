'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Campaign, ScheduledMessage, EnrolleeDisplayEntry } from '@/lib/airtable/types';
import type { SlotData } from '@/lib/airtable/scheduled-messages';
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SlotState {
  title: string;
  date: string;
  time: string;
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
  pending: { label: 'ממתין',    className: 'bg-yellow-100 text-yellow-800' },
  sending: { label: 'נשלח כעת', className: 'bg-blue-100 text-blue-800' },
  sent:    { label: 'נשלח',     className: 'bg-green-100 text-green-800' },
  failed:  { label: 'נכשל',     className: 'bg-red-100 text-red-800' },
};

const CAMPAIGN_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  future: { label: 'עתידי', className: 'bg-blue-100 text-blue-700' },
  active: { label: 'פעיל',  className: 'bg-green-100 text-green-700' },
  ended:  { label: 'הסתיים', className: 'bg-gray-100 text-gray-600' },
};

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

interface Props {
  campaign: Campaign;
  enrollmentCount: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CampaignPageClient({ campaign, enrollmentCount }: Props) {
  const router = useRouter();

  // Messages state
  const [loading, setLoading] = React.useState(false);
  const [slots, setSlots] = React.useState<SlotState[]>([EMPTY_SLOT(), EMPTY_SLOT(), EMPTY_SLOT(), EMPTY_SLOT()]);
  const [slotSaving, setSlotSaving] = React.useState<boolean[]>([false, false, false, false]);
  const [slotError, setSlotError] = React.useState<(string | null)[]>([null, null, null, null]);
  const [slotSuccess, setSlotSuccess] = React.useState<boolean[]>([false, false, false, false]);

  // Welcome message state
  const [welcomeTitle, setWelcomeTitle] = React.useState(campaign.welcome_message_title ?? '');
  const [welcomeContent, setWelcomeContent] = React.useState(campaign.welcome_message ?? '');
  const [welcomeSaving, setWelcomeSaving] = React.useState(false);
  const [welcomeError, setWelcomeError] = React.useState<string | null>(null);
  const [welcomeSuccess, setWelcomeSuccess] = React.useState(false);

  // Broadcast state
  const [broadcastMessage, setBroadcastMessage] = React.useState('');
  const [broadcastTarget, setBroadcastTarget] = React.useState<BroadcastTarget>('campaign');
  const [broadcastConfirm, setBroadcastConfirm] = React.useState(false);
  const [broadcastPending, setBroadcastPending] = React.useState(false);
  const [broadcastResult, setBroadcastResult] = React.useState<{ sent: number; failed: number } | null>(null);
  const [broadcastError, setBroadcastError] = React.useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = React.useState<'messages' | 'log' | 'enrollees'>('enrollees');

  // Log state
  const [logEntries, setLogEntries] = React.useState<MessageLogDisplayEntry[] | null>(null);
  const [logLoading, setLogLoading] = React.useState(false);
  const [logError, setLogError] = React.useState<string | null>(null);
  const [showFailuresOnly, setShowFailuresOnly] = React.useState(false);

  // Enrollees state
  const [enrolleeEntries, setEnrolleeEntries] = React.useState<EnrolleeDisplayEntry[] | null>(null);
  const [enrolleesLoading, setEnrolleesLoading] = React.useState(false);
  const [enrolleesError, setEnrolleesError] = React.useState<string | null>(null);
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  // Delete state
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // Load messages on mount
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCampaignMessagesAction(campaign.id).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if ('error' in result) return;
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
  }, [campaign.id]);

  // Lazy-load log
  React.useEffect(() => {
    if (activeTab !== 'log' || logEntries !== null) return;
    let cancelled = false;
    setLogLoading(true);
    getCampaignLogAction(campaign.id).then((result) => {
      if (cancelled) return;
      setLogLoading(false);
      if ('error' in result) { setLogError(result.error); return; }
      setLogEntries(result.entries);
    });
    return () => { cancelled = true; };
  }, [activeTab, campaign.id, logEntries]);

  // Lazy-load enrollees
  React.useEffect(() => {
    if (activeTab !== 'enrollees' || enrolleeEntries !== null) return;
    let cancelled = false;
    setEnrolleesLoading(true);
    getEnrolleesAction(campaign.id).then((result) => {
      if (cancelled) return;
      setEnrolleesLoading(false);
      if ('error' in result) { setEnrolleesError(result.error); return; }
      setEnrolleeEntries(result.enrollees);
    });
    return () => { cancelled = true; };
  }, [activeTab, campaign.id, enrolleeEntries]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function updateSlot(i: number, patch: Partial<SlotState>) {
    setSlots((prev) => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  }

  async function handleSaveSlot(i: number) {
    const slot = slots[i];
    if (!slot.content.trim()) {
      setSlotError((prev) => prev.map((e, idx) => idx === i ? 'יש למלא תוכן הודעה.' : e));
      return;
    }
    if (!slot.date) {
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
    const saved = result.savedSlots.find((s) => s.slot_index === i + 1);
    if (saved) updateSlot(i, { recordId: saved.recordId });
  }

  async function handleSaveWelcome() {
    setWelcomeError(null);
    setWelcomeSaving(true);
    setWelcomeSuccess(false);
    const result = await saveWelcomeMessageAction(campaign.id, welcomeTitle, welcomeContent);
    setWelcomeSaving(false);
    if ('error' in result) { setWelcomeError(result.error); return; }
    setWelcomeSuccess(true);
    setTimeout(() => setWelcomeSuccess(false), 3000);
  }

  async function handleBroadcastConfirm() {
    setBroadcastPending(true);
    setBroadcastError(null);
    setBroadcastResult(null);
    setBroadcastConfirm(false);
    const result = await broadcastAction(campaign.id, broadcastMessage, broadcastTarget);
    setBroadcastPending(false);
    if ('error' in result) { setBroadcastError(result.error); return; }
    setBroadcastResult({ sent: result.sent, failed: result.failed });
    setBroadcastMessage('');
  }

  async function handleDelete() {
    if (!confirm(`למחוק את הקמפיין "${campaign.campaign_name}"? פעולה זו אינה הפיכה.`)) return;
    setDeleting(true);
    const result = await deleteCampaignAction(campaign.id);
    setDeleting(false);
    if ('error' in result) { setDeleteError(result.error); return; }
    router.push('/kampanim');
    router.refresh();
  }

  async function handleRemove(enrollmentId: string) {
    if (!window.confirm('לבטל את הרישום? פעולה זו אינה הפיכה.')) return;
    setRemovingId(enrollmentId);
    const result = await removeEnrollmentAction(enrollmentId);
    setRemovingId(null);
    if ('error' in result) { setEnrolleesError(result.error); return; }
    setEnrolleeEntries((prev) => prev?.filter((e) => e.enrollment_id !== enrollmentId) ?? null);
  }

  const statusBadge = CAMPAIGN_STATUS_BADGE[campaign.status];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col gap-6">

        {/* Back link */}
        <a
          href="/kampanim"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <span>→</span>
          <span>חזרה לקמפיינים</span>
        </a>

        {/* Campaign header */}
        <div className="rounded-xl border bg-card px-6 py-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h1 className="text-2xl font-bold leading-tight">{campaign.campaign_name}</h1>
            {statusBadge && (
              <span className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span>📅</span>
              <span>{formatEventDate(campaign.event_date)}{campaign.event_time ? ` בשעה ${campaign.event_time}` : ''}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span>👥</span>
              <span className="font-medium text-foreground">{enrollmentCount} נרשמות</span>
            </span>
          </div>

          {campaign.description && (
            <p className="text-sm text-muted-foreground border-t pt-3 mt-1">{campaign.description}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b flex gap-0">
          {(
            [
              { id: 'enrollees', label: 'נרשמות' },
              { id: 'messages',  label: 'הודעות' },
              { id: 'log',       label: 'יומן שליחות' },
            ] as { id: typeof activeTab; label: string }[]
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Messages tab ──────────────────────────────────────────────── */}
        {activeTab === 'messages' && (
          <div className="flex flex-col gap-6">
            {loading && (
              <p className="text-sm text-muted-foreground text-center py-6">טוענת הודעות...</p>
            )}

            {/* Welcome message */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5 flex flex-col gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-800">הודעת ברוכה הבאה</p>
                <p className="text-xs text-muted-foreground mt-0.5">נשלחת לנרשמת עם ההרשמה לקמפיין</p>
              </div>
              <input
                type="text"
                dir="rtl"
                placeholder="כותרת (אופציונלי)"
                value={welcomeTitle}
                onChange={(e) => { setWelcomeTitle(e.target.value); setWelcomeError(null); }}
                className="w-full rounded-lg border px-3 py-2 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <textarea
                rows={3}
                dir="rtl"
                placeholder="תוכן ההודעה..."
                value={welcomeContent}
                onChange={(e) => { setWelcomeContent(e.target.value); setWelcomeError(null); }}
                className="w-full resize-none rounded-lg border px-3 py-2 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex items-center justify-between gap-3">
                <div>
                  {welcomeError && <p className="text-xs text-red-600">{welcomeError}</p>}
                  {welcomeSuccess && <p className="text-xs text-green-600">✓ נשמר</p>}
                </div>
                <button
                  onClick={handleSaveWelcome}
                  disabled={welcomeSaving || loading}
                  className="rounded-lg bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {welcomeSaving ? 'שומר...' : 'שמור הודעה'}
                </button>
              </div>
            </div>

            {/* 4 message slots in 2×2 grid */}
            {!loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {slots.map((slot, i) => {
                  const preview = slot.date && slot.time
                    ? formatSendPreview(israelDateTimeToUTC(slot.date, slot.time))
                    : '';
                  return (
                    <div key={i} className="rounded-xl border bg-card p-5 flex flex-col gap-3">
                      {/* Slot header */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">הודעה {i + 1}</span>
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
                        className="w-full rounded-lg border px-3 py-2 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />

                      {/* Date + Time */}
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={slot.date}
                          dir="ltr"
                          onChange={(e) => updateSlot(i, { date: e.target.value })}
                          className="flex-1 min-w-0 rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <select
                          value={slot.time}
                          onChange={(e) => updateSlot(i, { time: e.target.value })}
                          className="rounded-lg border px-2 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {TIME_OPTIONS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      {preview && (
                        <p className="text-xs text-muted-foreground -mt-1">{preview}</p>
                      )}

                      {/* Content */}
                      <textarea
                        rows={4}
                        dir="rtl"
                        placeholder="תוכן ההודעה..."
                        value={slot.content}
                        onChange={(e) => updateSlot(i, { content: e.target.value })}
                        className="w-full resize-none rounded-lg border px-3 py-2 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />

                      {/* Feedback + save */}
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          {slotError[i] && <p className="text-xs text-red-600">{slotError[i]}</p>}
                          {slotSuccess[i] && <p className="text-xs text-green-600">✓ נשמר</p>}
                        </div>
                        <button
                          onClick={() => handleSaveSlot(i)}
                          disabled={slotSaving[i] || loading}
                          className="rounded-lg bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {slotSaving[i] ? 'שומר...' : 'שמור'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Broadcast section */}
            <div className="rounded-xl border p-5 flex flex-col gap-4">
              <h3 className="text-sm font-semibold">שליחה ידנית (Broadcast)</h3>

              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {(
                  [
                    { value: 'campaign',      label: `נרשמות לקמפיין זה (${enrollmentCount})` },
                    { value: 'all_enrollees', label: 'כל הנרשמות (כל הקמפיינים)' },
                    { value: 'all_contacts',  label: 'כל המתעניינות' },
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
                onChange={(e) => { setBroadcastMessage(e.target.value); setBroadcastResult(null); setBroadcastError(null); }}
                disabled={broadcastPending}
                className="w-full resize-none rounded-lg border px-3 py-2 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />

              {!broadcastConfirm ? (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    {broadcastResult && (
                      <p className="text-sm text-green-700">
                        נשלחו {broadcastResult.sent} הודעות{broadcastResult.failed > 0 ? `, ${broadcastResult.failed} נכשלו` : ''}
                      </p>
                    )}
                    {broadcastError && <p className="text-sm text-red-600">{broadcastError}</p>}
                  </div>
                  <button
                    onClick={() => setBroadcastConfirm(true)}
                    disabled={!broadcastMessage.trim() || broadcastPending}
                    className="rounded-lg bg-primary text-primary-foreground px-5 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {broadcastPending ? 'שולחת...' : 'שלחי'}
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex flex-col gap-2">
                  <p className="text-sm font-medium text-amber-800">לאשר שליחה?</p>
                  <p className="text-xs text-amber-700">לא ניתן לבטל לאחר השליחה.</p>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setBroadcastConfirm(false)}
                      className="rounded-lg border px-4 py-1.5 text-sm font-medium hover:bg-background"
                    >
                      ביטול
                    </button>
                    <button
                      onClick={handleBroadcastConfirm}
                      className="rounded-lg bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:bg-primary/90"
                    >
                      אישור — שלחי
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Log tab ───────────────────────────────────────────────────── */}
        {activeTab === 'log' && (
          <div className="flex flex-col gap-4">
            {logLoading && (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                טוענת יומן שליחות...
              </div>
            )}
            {logError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {logError}
              </div>
            )}
            {logEntries !== null && !logLoading && (
              <>
                <div className="flex items-center gap-3">
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

                {logEntries.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                    אין רשומות יומן עדיין לקמפיין זה
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">שם מלא</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">טלפון</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">סטטוס</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">זמן שליחה</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">סיבת שגיאה</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(showFailuresOnly ? logEntries.filter(e => e.status === 'failed') : logEntries).map((entry, idx) => (
                          <tr key={entry.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                            <td className="px-4 py-3">{entry.full_name ?? '—'}</td>
                            <td className="px-4 py-3 tabular-nums" dir="ltr">
                              {entry.phone ? formatPhoneDisplay(entry.phone) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              {STATUS_BADGE[entry.status] ? (
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[entry.status].className}`}>
                                  {STATUS_BADGE[entry.status].label}
                                </span>
                              ) : entry.status}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground tabular-nums" dir="ltr">
                              {entry.logged_at
                                ? new Date(entry.logged_at).toLocaleString('he-IL', {
                                    timeZone: 'Asia/Jerusalem',
                                    day: '2-digit', month: '2-digit', year: '2-digit',
                                    hour: '2-digit', minute: '2-digit',
                                  })
                                : '—'}
                            </td>
                            <td className="px-4 py-3 text-red-600 text-xs">
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

        {/* ── Enrollees tab ─────────────────────────────────────────────── */}
        {activeTab === 'enrollees' && (
          <div className="flex flex-col gap-4">
            {enrolleesLoading && (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                טוענת נרשמות...
              </div>
            )}
            {enrolleesError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-mono break-all">
                {enrolleesError}
              </div>
            )}
            {!enrolleesLoading && !enrolleesError && enrolleeEntries !== null && enrolleeEntries.length === 0 && (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                אין נרשמות לקמפיין זה
              </div>
            )}
            {!enrolleesLoading && !enrolleesError && enrolleeEntries && enrolleeEntries.length > 0 && (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">שם מלא</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">טלפון</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">אימייל</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">אישרה וואטסאפ</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">ביטול רישום</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolleeEntries.map((entry, idx) => (
                      <tr key={entry.enrollment_id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        <td className="px-4 py-3">{entry.full_name}</td>
                        <td className="px-4 py-3 tabular-nums text-center" dir="ltr">
                          {entry.phone ? formatPhoneDisplay(entry.phone) : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{entry.email ?? '—'}</td>
                        <td className="px-4 py-3 text-center text-green-600">
                          {entry.whatsapp_confirmed ? '✓' : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleRemove(entry.enrollment_id)}
                            disabled={removingId === entry.enrollment_id}
                            className="rounded-lg border border-red-200 text-red-600 px-3 py-1 text-xs hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Delete campaign */}
        <div className="border-t pt-6 flex flex-col gap-2">
          {deleteError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {deleteError}
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={handleDelete}
              disabled={deleting || slotSaving.some(Boolean)}
              className="rounded-lg border border-red-200 text-red-600 px-5 py-2 text-sm font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'מוחק...' : 'מחק קמפיין'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
