'use client';

import * as React from 'react';
import type { Contact } from '@/lib/airtable/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ContactsTable } from './ContactsTable';
import { AddContactModal } from './AddContactModal';
import { ContactDetailPanel } from './ContactDetailPanel';

interface ContactsPageClientProps {
  contacts: Contact[];
}

function isThisMonth(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function isThisWeek(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return date >= sevenDaysAgo;
}

export function ContactsPageClient({ contacts }: ContactsPageClientProps) {
  const [search, setSearch] = React.useState('');
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(null);

  // Stats derived from contacts (no extra fetch)
  const totalContacts = contacts.length;
  const joinedThisMonth = contacts.filter((c) => isThisMonth(c.created_at)).length;
  const joinedThisWeek = contacts.filter((c) => isThisWeek(c.created_at)).length;

  // Search filter: match on full_name or phone (strip dashes from phone comparison)
  const searchTerm = search.trim().toLowerCase();
  const filtered = searchTerm
    ? contacts.filter((c) => {
        const nameMatch = c.full_name.toLowerCase().includes(searchTerm);
        const phoneMatch = c.phone.includes(searchTerm.replace(/-/g, '')) ||
          c.phone.includes(searchTerm);
        return nameMatch || phoneMatch;
      })
    : contacts;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">אנשי קשר</h1>
        <Button onClick={() => setAddModalOpen(true)}>
          הוסף איש קשר
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground font-normal">סך אנשי קשר</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalContacts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground font-normal">הצטרפו החודש</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{joinedThisMonth}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground font-normal">הצטרפו השבוע</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{joinedThisWeek}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם או טלפון..."
          className="h-9 w-full max-w-sm rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
        />
      </div>

      {/* Contacts table */}
      <ContactsTable contacts={filtered} onContactClick={setSelectedContact} />

      {/* Add contact modal */}
      <AddContactModal open={addModalOpen} onOpenChange={setAddModalOpen} />

      {/* Contact detail panel */}
      <ContactDetailPanel contact={selectedContact} onClose={() => setSelectedContact(null)} />
    </div>
  );
}
