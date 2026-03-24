'use client';

import type { Contact } from '@/lib/airtable/types';
import { formatPhoneDisplay } from '@/lib/airtable/phone';

interface ContactsTableProps {
  contacts: Contact[];
  onContactClick: (c: Contact) => void;
}

export function ContactsTable({ contacts, onContactClick }: ContactsTableProps) {
  if (contacts.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground text-sm">
        אין אנשי קשר עדיין
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-foreground/10 bg-muted/50">
            {/* RTL: first in JSX = rightmost visual column */}
            <th className="px-4 py-3 text-start font-medium text-muted-foreground">שם מלא</th>
            <th className="px-4 py-3 text-start font-medium text-muted-foreground">טלפון</th>
            <th className="px-4 py-3 text-start font-medium text-muted-foreground">כתובת מייל</th>
            <th className="px-4 py-3 text-start font-medium text-muted-foreground">תאריך הצטרפות</th>
            <th className="px-4 py-3 text-start font-medium text-muted-foreground">קמפיין</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr
              key={contact.id}
              onClick={() => onContactClick(contact)}
              className="border-b border-foreground/5 hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 font-medium">{contact.full_name}</td>
              <td className="px-4 py-3 text-muted-foreground">
                <span dir="ltr">{formatPhoneDisplay(contact.phone)}</span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {contact.email ?? '—'}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {contact.joined_date
                  ? new Date(contact.joined_date).toLocaleDateString('he-IL')
                  : '—'}
              </td>
              <td className="px-4 py-3 text-muted-foreground">—</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
