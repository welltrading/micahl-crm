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
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [whatsappConsent, setWhatsappConsent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Reset form when modal closes
  React.useEffect(() => {
    if (!open) {
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setWhatsappConsent(false);
      setError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await addContact(firstName, lastName, phone, email || undefined, whatsappConsent);
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
              <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label htmlFor="firstName" className="text-sm font-medium">
                    שם פרטי
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="שרה"
                    className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring disabled:opacity-50"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label htmlFor="lastName" className="text-sm font-medium">
                    שם משפחה
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="כהן"
                    className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring disabled:opacity-50"
                    disabled={isSubmitting}
                  />
                </div>
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

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium">
                  כתובת מייל <span className="text-muted-foreground font-normal">(אופציונלי)</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@example.com"
                  dir="ltr"
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring disabled:opacity-50"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="whatsappConsent"
                  type="checkbox"
                  checked={whatsappConsent}
                  onChange={(e) => setWhatsappConsent(e.target.checked)}
                  disabled={isSubmitting}
                  className="h-4 w-4 rounded border-input accent-foreground cursor-pointer"
                />
                <label htmlFor="whatsappConsent" className="text-sm cursor-pointer">
                  אישרה קבלת הודעות וואטסאפ
                </label>
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
