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

export function aggregateByMonth(
  contacts: Contact[],
  fromStr: string,
  toStr: string
): { key: string; count: number }[] {
  const fromDate = fromStr ? new Date(fromStr + 'T00:00:00') : null;
  const toDate = toStr ? new Date(toStr + 'T23:59:59') : null;

  const counts: Record<string, number> = {};
  for (const c of contacts) {
    const d = new Date(c.created_at);
    if (fromDate && d < fromDate) continue;
    if (toDate && d > toDate) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return Object.entries(counts)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, count]) => ({ key, count }));
}

function getDefaultFrom(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().slice(0, 10);
}

function getDefaultTo(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
}

export function ContactsPageClient({ contacts }: ContactsPageClientProps) {
  const [search, setSearch] = React.useState('');
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(null);
  const [fromStr, setFromStr] = React.useState(getDefaultFrom);
  const [toStr, setToStr] = React.useState(getDefaultTo);

  // Stats derived from contacts (no extra fetch)
  const totalContacts = contacts.length;
  const joinedThisMonth = contacts.filter((c) => isThisMonth(c.created_at)).length;
  const joinedThisWeek = contacts.filter((c) => isThisWeek(c.created_at)).length;

  // Growth aggregation — client-side from existing contacts prop
  const growthData = React.useMemo(
    () => aggregateByMonth(contacts, fromStr, toStr),
    [contacts, fromStr, toStr]
  );

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

      {/* Growth table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">צמיחת קהל לפי חודש</CardTitle>
          <div className="flex gap-2 items-center flex-wrap mt-2">
            <label className="text-xs text-muted-foreground">מ-</label>
            <input
              type="date"
              value={fromStr}
              dir="ltr"
              onChange={(e) => setFromStr(e.target.value)}
              className="rounded-md border px-2 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <label className="text-xs text-muted-foreground">עד</label>
            <input
              type="date"
              value={toStr}
              dir="ltr"
              onChange={(e) => setToStr(e.target.value)}
              className="rounded-md border px-2 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </CardHeader>
        <CardContent>
          {growthData.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין הצטרפויות בטווח התאריכים שנבחר</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-2 text-start font-medium">חודש</th>
                  <th className="pb-2 text-start font-medium">הצטרפו</th>
                </tr>
              </thead>
              <tbody>
                {growthData.map(({ key, count }) => (
                  <tr key={key} className="border-b last:border-0">
                    <td className="py-2 pe-4">{formatMonthLabel(key)}</td>
                    <td className="py-2 font-medium">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

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
