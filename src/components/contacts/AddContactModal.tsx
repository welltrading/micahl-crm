'use client';

import * as React from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { useRouter } from 'next/navigation';
import { addContact } from '@/app/anshei-kesher/actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AddContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddContactModal({ open, onOpenChange }: AddContactModalProps) {
  const router = useRouter();
  const [fullName, setFullName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Reset form when modal closes
  React.useEffect(() => {
    if (!open) {
      setFullName('');
      setPhone('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await addContact(fullName, phone);
      if ('error' in result) {
        setError(result.error);
        setIsSubmitting(false);
      } else {
        onOpenChange(false);
        router.refresh();
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
            <Dialog.Title className="text-lg font-semibold">הוספת איש קשר</Dialog.Title>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="fullName" className="text-sm font-medium">
                  שם מלא
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="לדוגמה: שרה כהן"
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring disabled:opacity-50"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="phone" className="text-sm font-medium">
                  טלפון
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="לדוגמה: 050-123-4567"
                  dir="ltr"
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring disabled:opacity-50"
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

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
                  {isSubmitting ? 'שומר...' : 'הוסף'}
                </Button>
              </div>
            </form>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
