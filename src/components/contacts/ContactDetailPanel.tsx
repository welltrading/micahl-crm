'use client';

import * as React from 'react';
import type { Contact, CampaignEnrollment, ScheduledMessage } from '@/lib/airtable/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { getContactDetail } from '@/app/anshei-kesher/actions';
import { removeEnrollmentAction } from '@/app/kampanim/actions';
import { formatPhoneDisplay } from '@/lib/airtable/phone';

interface ContactDetailPanelProps {
  contact: Contact | null;
  onClose: () => void;
}


const STATUS_LABEL_HE: Record<ScheduledMessage['status'], string> = {
  pending: 'ממתינה',
  sending: 'שולח',
  sent: 'נשלחה',
  failed: 'נכשלה',
};

const STATUS_BADGE_CLASS: Record<ScheduledMessage['status'], string> = {
  pending: 'bg-gray-100 text-gray-700',
  sending: 'bg-blue-100 text-blue-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('he-IL');
}

export function ContactDetailPanel({ contact, onClose }: ContactDetailPanelProps) {
  const [detail, setDetail] = React.useState<{
    enrollments: CampaignEnrollment[];
    messages: ScheduledMessage[];
    campaigns: { id: string; campaign_name: string; event_date: string }[];
  } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [campaignMap, setCampaignMap] = React.useState<Record<string, { name: string; date: string }>>({});
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!contact) {
      setDetail(null);
      setCampaignMap({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    getContactDetail(contact.id).then((data) => {
      if (!cancelled) {
        setDetail(data);
        const map: Record<string, { name: string; date: string }> = {};
        for (const c of data.campaigns) {
          map[c.id] = { name: c.campaign_name, date: c.event_date };
        }
        setCampaignMap(map);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [contact?.id]);

  return (
    <Sheet open={!!contact} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{contact?.full_name}</SheetTitle>
        </SheetHeader>

        {contact && (
          <div className="flex flex-col gap-4 p-4 overflow-y-auto">
            {/* Contact info */}
            <div className="flex flex-col gap-1 text-sm">
              <p>
                <span className="font-medium">טלפון:</span>{' '}
                <span dir="ltr">{formatPhoneDisplay(contact.phone)}</span>
              </p>
              {contact.email && (
                <p>
                  <span className="font-medium">מייל:</span>{' '}
                  <span dir="ltr">{contact.email}</span>
                </p>
              )}
              <p>
                <span className="font-medium">תאריך הצטרפות:</span>{' '}
                {formatDate(contact.joined_date)}
              </p>
            </div>

            {/* Message history */}
            <div>
              <h3 className="text-sm font-semibold mb-2">היסטוריית הודעות</h3>

              {loading && <p className="text-sm text-muted-foreground">טוען...</p>}

              {!loading && detail && detail.enrollments.length === 0 && (
                <p className="text-sm text-muted-foreground">אין רישומים לקמפיינים</p>
              )}

              {!loading && detail && detail.enrollments.length > 0 && (
                <div className="flex flex-col gap-4">
                  {detail.enrollments.map((enrollment) => {
                    const campaignId = enrollment.campaign_id[0];
                    const campaignMessages = detail.messages.filter(
                      (m) => m.campaign_id[0] === campaignId
                    );
                    return (
                      <div key={enrollment.id} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {campaignMap[campaignId]
                              ? campaignMap[campaignId].name + ' — ' + formatDate(campaignMap[campaignId].date)
                              : campaignId}
                          </p>
                          <button
                            className="text-xs text-destructive hover:underline disabled:opacity-40"
                            disabled={removingId === enrollment.id}
                            onClick={async () => {
                              setRemovingId(enrollment.id);
                              await removeEnrollmentAction(enrollment.id);
                              setDetail((prev) => prev ? {
                                ...prev,
                                enrollments: prev.enrollments.filter((e) => e.id !== enrollment.id),
                              } : prev);
                              setRemovingId(null);
                            }}
                          >
                            {removingId === enrollment.id ? 'מבטל...' : 'בטל רישום'}
                          </button>
                        </div>
                        {campaignMessages.length === 0 ? (
                          <p className="text-sm text-muted-foreground ps-2">אין הודעות מתוזמנות</p>
                        ) : (
                          <div className="flex flex-col gap-1 ps-2">
                            {campaignMessages.map((msg) => (
                              <div
                                key={msg.id}
                                className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-sm"
                              >
                                <span>{msg.title || `הודעה ${msg.slot_index}`}</span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[msg.status]}`}
                                >
                                  {STATUS_LABEL_HE[msg.status]}
                                </span>
                                <span
                                  dir="ltr"
                                  className="text-xs text-muted-foreground"
                                >
                                  {msg.send_date}{msg.send_time ? ` ${msg.send_time}` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
