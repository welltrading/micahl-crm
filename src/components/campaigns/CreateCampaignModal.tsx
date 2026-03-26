'use client';

import * as React from 'react';
import { Dialog } from '@base-ui/react/dialog';
import type { Campaign } from '@/lib/airtable/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createCampaignAction } from '@/app/kampanim/actions';

interface CreateCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCampaignCreated: (campaign: Campaign) => void;
}

// Time options every 30 minutes: 00:00 to 23:30
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

export function CreateCampaignModal({
  open,
  onOpenChange,
  onCampaignCreated,
}: CreateCampaignModalProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Reset form state when modal closes
  React.useEffect(() => {
    if (!open) {
      setError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await createCampaignAction(formData);

      if ('error' in result) {
        setError(result.error);
        setIsSubmitting(false);
      } else {
        onCampaignCreated(result.campaign);
        onOpenChange(false);
      }
    } catch {
      setError('אירעה שגיאה. נסי שנית.');
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0"
        />
        <Dialog.Popup
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center p-4',
            'data-ending-style:opacity-0 data-starting-style:opacity-0',
            'transition-opacity duration-150'
          )}
        >
          <div className="w-full max-w-md rounded-xl bg-background ring-1 ring-foreground/10 shadow-lg p-6 flex flex-col gap-5">
            <Dialog.Title className="text-lg font-semibold">צור קמפיין חדש</Dialog.Title>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* שם קמפיין */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="campaign_name" className="text-sm font-medium">
                  שם קמפיין
                </label>
                <input
                  id="campaign_name"
                  name="campaign_name"
                  type="text"
                  required
                  placeholder="לדוגמה: קמפיין פסח 2026"
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring disabled:opacity-50"
                  disabled={isSubmitting}
                />
              </div>

              {/* תאריך האירוע */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="event_date" className="text-sm font-medium">
                  תאריך האירוע
                </label>
                <input
                  id="event_date"
                  name="event_date"
                  type="date"
                  required
                  dir="ltr"
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring disabled:opacity-50"
                  disabled={isSubmitting}
                />
              </div>

              {/* שעת האירוע */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="event_time" className="text-sm font-medium">
                  שעת האירוע
                </label>
                <select
                  id="event_time"
                  name="event_time"
                  required
                  defaultValue="19:00"
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* סוג קמפיין */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="campaign_type" className="text-sm font-medium">
                  סוג קמפיין
                </label>
                <select
                  id="campaign_type"
                  name="campaign_type"
                  required
                  defaultValue="free"
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  <option value="free">חינמי</option>
                  <option value="paid">בתשלום</option>
                </select>
              </div>

              {/* תיאור (optional) */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="description" className="text-sm font-medium">
                  תיאור <span className="text-muted-foreground font-normal">(אופציונלי)</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="תיאור קצר של הקמפיין..."
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring disabled:opacity-50 resize-none"
                  disabled={isSubmitting}
                />
              </div>

              {/* Inline error */}
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  ביטול
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'יוצרת...' : 'צרי קמפיין'}
                </Button>
              </div>
            </form>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
