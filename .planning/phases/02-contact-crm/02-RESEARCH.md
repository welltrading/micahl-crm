# Phase 2: Contact CRM - Research

**Researched:** 2026-03-18
**Domain:** Next.js 16 App Router — RTL contact management UI, Airtable CRUD, Next.js API route webhook
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Contact list display**
- Table layout (rows + columns) — not card grid or simple list
- Columns: שם מלא, טלפון, תאריך הצטרפות, קמפיין
- Phone displayed in human-readable format (050-123-4567) not raw normalized (972XXXXXXXXXX)
- Search box at top of page — filters by name or phone, client-side filtering

**Contact detail view**
- Slide panel (Sheet component, already in codebase) — not full page navigation
- Panel content: contact info (name, phone, join date) + campaign enrollments + message history per CONT-02 requirement
- Message history grouped by campaign (campaign name as section header, messages listed under it)

**Manual add contact**
- Modal dialog triggered by a button on the contacts page — not slide panel, not inline form
- Required fields: שם מלא + טלפון only (minimal friction)
- Duplicate phone check: block and show Hebrew error message ("המספר כבר קיים במערכת")

**Stats display**
- Summary stat cards at top of contacts page (above the table)
- Stats shown: סך אנשי קשר, הצטרפו החודש, הצטרפו השבוע

**Webhook UX**
- MAKE.com webhook adds contacts silently — no real-time notification needed
- New contact appears on next page refresh — acceptable for v1

### Claude's Discretion
- Exact table styling, column widths, hover states
- Loading skeleton / spinner design
- Empty state (no contacts yet) design
- Phone formatting utility implementation (972XXXXXXXXXX → 050-123-4567)
- Webhook authentication (secret token in header or URL param)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONT-01 | מיכל יכולה לראות רשימת כל אנשי הקשר (שם, טלפון, תאריך הצטרפות, קמפיין) | `getContacts()` exists; table UI + client search needed |
| CONT-02 | מיכל יכולה לראות לכל איש קשר אילו הודעות קיבל | Need new `getEnrollmentsForContact()` + `getScheduledMessagesForContact()` Airtable functions |
| CONT-03 | מיכל יכולה לראות סטטיסטיקות בסיסיות — כמה נרשמו בחודש, סך הכל | Derivable from `getContacts()` result using `created_at` / `joined_date` date math |
| UX-01 | כל פעולה שגרתית מתבצעת דרך ממשק ויזואלי ברור — ללא עריכת קוד, ללא גישה ל-Airtable ישירות | All UI actions are via the dashboard; `createContact()` Server Action handles add flow |
| INFRA-04 | Webhook endpoint שמאפשר ל-MAKE.com להוסיף נרשמת חדשה למערכת | Next.js Route Handler at `src/app/api/webhook/contact/route.ts` |
</phase_requirements>

---

## Summary

Phase 2 builds the Contact CRM on top of the fully-operational Phase 1 foundation. The project already has `getContacts()` and `getContactById()` in `src/lib/airtable/contacts.ts`, the Sheet slide panel component, Card stat components, and the placeholder page at `src/app/anshei-kesher/page.tsx`. This phase wires them together and adds the missing pieces: a `createContact()` function, functions for fetching enrollments and scheduled messages by contact, a Next.js Server Action for the add-contact modal, and a webhook Route Handler.

The architecture follows the established pattern strictly: server components fetch data from Airtable, client components handle interactivity. The contacts page will be a split: a server component that fetches contacts and passes them as props to a client component that owns search state, modal state, and sheet state. Stats are computed from the already-fetched contacts array — no extra Airtable calls needed.

The most complex piece is the contact detail panel (CONT-02): it requires two additional Airtable queries — enrollments filtered by contact, and scheduled messages filtered by contact — then joining them to produce the campaign-grouped message history. These must be queried server-side via Server Actions or Route Handlers triggered when the user opens the panel.

**Primary recommendation:** Build the contacts page as a server/client split, use Server Actions for write operations (add contact), and trigger panel data via a Server Action called on row click. Keep the webhook route simple and stateless.

---

## Standard Stack

### Core (already installed — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.7 | App Router, Server Components, Route Handlers | Already in project |
| airtable SDK | 0.12.2 | Airtable data access | Already in project, service layer established |
| @base-ui/react | 1.3.0 | Sheet (slide panel), Dialog (modal) | Already in project — Sheet.tsx uses `Dialog` from base-ui |
| lucide-react | 0.577.0 | Icons | Already in project |
| Tailwind 4 | 4.x | Styling with RTL logical properties | Already in project |
| TypeScript | 5.x | Type safety | Already in project |

### No new dependencies required

All UI primitives needed for this phase are already installed:
- Sheet component (slide panel): `src/components/ui/sheet.tsx` — uses `@base-ui/react/dialog`
- Card component (stat cards): `src/components/ui/card.tsx`
- Button component: `src/components/ui/button.tsx`
- A modal dialog for "add contact" can use `@base-ui/react/dialog` directly (same primitive Sheet uses)

### Airtable Hebrew field name reference (confirmed from setup-airtable.ts)

| Table | Field name in Airtable | Type |
|-------|------------------------|------|
| Contacts | שם מלא | singleLineText |
| Contacts | טלפון | phoneNumber |
| Contacts | תאריך הצטרפות | date |
| Contacts | הערות | multilineText |
| Contacts | נוצר בתאריך | createdTime (auto) |
| CampaignEnrollments | קמפיין | linked → Campaigns |
| CampaignEnrollments | איש קשר | linked → Contacts |
| CampaignEnrollments | מקור | singleSelect (ידני / Webhook) |
| CampaignEnrollments | תאריך רישום | dateTime |
| ScheduledMessages | קמפיין | linked → Campaigns |
| ScheduledMessages | איש קשר | linked → Contacts |
| ScheduledMessages | תוכן ההודעה | multilineText |
| ScheduledMessages | שליחה בשעה | dateTime |
| ScheduledMessages | תזמון | singleSelect |
| ScheduledMessages | סטטוס | singleSelect |
| ScheduledMessages | נשלח בשעה | dateTime |

**CRITICAL:** Linked record fields (קמפיין, איש קשר) were added manually in Airtable UI after the setup script ran — they are NOT in the `setup-airtable.ts` field definitions. When filtering by contact, use `filterByFormula` with the record ID.

---

## Architecture Patterns

### Recommended File Structure for This Phase

```
src/
├── app/
│   ├── anshei-kesher/
│   │   └── page.tsx              # Server component — fetches contacts, renders ContactsPageClient
│   └── api/
│       └── webhook/
│           └── contact/
│               └── route.ts     # POST handler for MAKE.com webhook
├── components/
│   └── contacts/
│       ├── ContactsPageClient.tsx  # "use client" — owns search/sheet/modal state
│       ├── ContactsTable.tsx       # Pure display table, receives filtered contacts
│       ├── ContactDetailPanel.tsx  # Sheet panel — calls server action on open
│       └── AddContactModal.tsx     # Dialog modal — calls server action on submit
└── lib/
    └── airtable/
        ├── contacts.ts           # Add: createContact(), getContactEnrollments(), getContactMessages()
        └── phone.ts              # New: normalizePhone(), formatPhoneDisplay()
```

### Pattern 1: Server/Client Split for the Contacts Page

**What:** Server component fetches all contacts and passes as props to a client component. Stats are computed from the props array. Search is client-side filtering over the props array.

**When to use:** Data is small enough to load all at once (Airtable contacts for a personal coach), interactivity (search, open panel, open modal) requires client state.

```typescript
// src/app/anshei-kesher/page.tsx — SERVER COMPONENT
import { getContacts } from '@/lib/airtable/contacts';
import { ContactsPageClient } from '@/components/contacts/ContactsPageClient';

export default async function AnsheiKesherPage() {
  const contacts = await getContacts();
  return <ContactsPageClient contacts={contacts} />;
}
```

```typescript
// src/components/contacts/ContactsPageClient.tsx
'use client';
import { useState } from 'react';
import type { Contact } from '@/lib/airtable/types';

export function ContactsPageClient({ contacts }: { contacts: Contact[] }) {
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const filtered = contacts.filter(
    (c) =>
      c.full_name.includes(search) ||
      c.phone.includes(search.replace(/-/g, ''))
  );

  // Stats derived from contacts — no extra fetch
  const now = new Date();
  const thisMonth = contacts.filter((c) => {
    const d = new Date(c.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const thisWeek = contacts.filter((c) => {
    const d = new Date(c.created_at);
    return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
  });

  // ... render stat cards, search input, table, sheet, modal
}
```

### Pattern 2: Server Action for Write Operations

**What:** Next.js Server Actions called directly from client components. No custom API route needed for writes.

**When to use:** Form submissions, Airtable writes that need server-side access tokens.

```typescript
// src/app/anshei-kesher/actions.ts
'use server';
import { airtableBase } from '@/lib/airtable/client';
import { normalizePhone } from '@/lib/airtable/phone';
import { getContacts } from '@/lib/airtable/contacts';
import { revalidatePath } from 'next/cache';

export async function addContact(formData: FormData) {
  const fullName = formData.get('full_name') as string;
  const rawPhone = formData.get('phone') as string;
  const normalized = normalizePhone(rawPhone);

  // Duplicate check
  const existing = await getContacts();
  const duplicate = existing.find((c) => c.phone === normalized);
  if (duplicate) {
    return { error: 'המספר כבר קיים במערכת' };
  }

  await airtableBase('Contacts').create({
    'שם מלא': fullName,
    'טלפון': normalized,
    'תאריך הצטרפות': new Date().toISOString().split('T')[0],
  });

  revalidatePath('/anshei-kesher');
  return { success: true };
}
```

### Pattern 3: On-Demand Panel Data via Server Action

**What:** When user clicks a contact row, open the Sheet, then call a Server Action to fetch that contact's enrollments and messages. Avoids loading all enrollment data upfront.

**When to use:** Detail data needed only on demand, not on initial page load.

```typescript
// src/app/anshei-kesher/actions.ts (add to same file)
export async function getContactDetail(contactId: string) {
  const enrollments = await getContactEnrollments(contactId);
  const messages = await getContactMessages(contactId);
  return { enrollments, messages };
}
```

### Pattern 4: Webhook Route Handler

**What:** `src/app/api/webhook/contact/route.ts` receives POST from MAKE.com, normalizes phone, creates Airtable record.

**Authentication:** Secret token checked from `Authorization: Bearer <token>` header or `?secret=<token>` query param. Token stored in env var `WEBHOOK_SECRET`.

```typescript
// src/app/api/webhook/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { airtableBase } from '@/lib/airtable/client';
import { normalizePhone } from '@/lib/airtable/phone';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret');
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { full_name, phone, campaign } = body;

  if (!full_name || !phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(phone);

  await airtableBase('Contacts').create({
    'שם מלא': full_name,
    'טלפון': normalizedPhone,
    'תאריך הצטרפות': new Date().toISOString().split('T')[0],
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
```

### Pattern 5: Phone Normalization Utility

**What:** Pure function, no dependencies. Handles Israeli mobile formats to canonical 972XXXXXXXXXX, and display formatting 972XXXXXXXXXX → 050-123-4567.

```typescript
// src/lib/airtable/phone.ts

/**
 * Normalize Israeli phone to 972XXXXXXXXXX format.
 * Handles: 050-123-4567, 0501234567, +972501234567, 972501234567
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return '972' + digits.slice(1);
  return '972' + digits;
}

/**
 * Format normalized phone for display.
 * 972501234567 → 050-123-4567
 */
export function formatPhoneDisplay(normalized: string): string {
  // Strip country code, add leading 0
  const local = '0' + normalized.slice(3); // "0501234567"
  // Israeli mobile: 0XX-XXX-XXXX (3+3+4 pattern)
  return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
}
```

### Pattern 6: Filtering Airtable by Linked Record

**What:** To fetch enrollments for a contact, use Airtable `filterByFormula` with FIND and record ID.

```typescript
// src/lib/airtable/contacts.ts — new functions to add

export async function getContactEnrollments(contactId: string): Promise<CampaignEnrollment[]> {
  const records = await airtableBase('CampaignEnrollments')
    .select({
      filterByFormula: `FIND("${contactId}", ARRAYJOIN({איש קשר}))`,
    })
    .all();

  return records.map((r) => ({
    id: r.id,
    campaign_id: r.fields['קמפיין'] as string[],
    contact_id: r.fields['איש קשר'] as string[],
    enrolled_at: r.fields['תאריך רישום'] as string | undefined,
    source: (r.fields['מקור'] === 'Webhook' ? 'webhook' : 'manual') as 'webhook' | 'manual',
  }));
}

export async function getContactMessages(contactId: string): Promise<ScheduledMessage[]> {
  const records = await airtableBase('ScheduledMessages')
    .select({
      filterByFormula: `FIND("${contactId}", ARRAYJOIN({איש קשר}))`,
    })
    .all();

  return records.map((r) => ({
    id: r.id,
    campaign_id: r.fields['קמפיין'] as string[],
    contact_id: r.fields['איש קשר'] as string[],
    message_content: r.fields['תוכן ההודעה'] as string,
    send_at: r.fields['שליחה בשעה'] as string,
    offset_label: mapOffsetLabel(r.fields['תזמון'] as string),
    status: mapMessageStatus(r.fields['סטטוס'] as string),
    sent_at: r.fields['נשלח בשעה'] as string | undefined,
  }));
}
```

### Anti-Patterns to Avoid

- **Fetching enrollments/messages on page load for all contacts:** Airtable has rate limits (50 req/sec on Personal Access Token but 1,000 calls/month on Free plan). Load detail data only when a panel opens, not on page load.
- **Calling `getContacts()` again inside `addContact()` for duplicate check:** This is two Airtable calls per add. Acceptable for v1 at this scale; not a problem now but worth noting.
- **Using `flex-row-reverse` for RTL layout:** The project confirmed this double-reverses. Trust `dir="rtl"` on `<html>` — flex-row puts elements right-to-left automatically.
- **Building a custom dialog:** `@base-ui/react/dialog` is already the primitive Sheet.tsx uses. Use it directly for the add-contact modal — same pattern, same animation support.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slide panel | Custom drawer with CSS transitions | `Sheet` from `src/components/ui/sheet.tsx` | Already built, RTL-aware, uses base-ui/dialog |
| Modal dialog | Custom overlay with portal | `@base-ui/react/dialog` | Same primitive Sheet uses — consistent UX |
| Table layout | Custom grid or flex table | Native `<table>` with Tailwind | Semantic, accessible, RTL flows correctly |
| Phone normalization | Regex from memory | `src/lib/airtable/phone.ts` (new utility) | One function, tested, reused by webhook + UI |
| Stats calculation | Extra Airtable queries | Derive from `contacts` array already fetched | Zero extra API calls |

---

## Common Pitfalls

### Pitfall 1: Airtable Linked Record Filter Formula

**What goes wrong:** Filtering linked records with `{איש קשר} = "recXXX"` does not work — Airtable linked fields return arrays.

**Why it happens:** Linked record fields are multi-value arrays in the Airtable formula engine.

**How to avoid:** Use `FIND("recXXX", ARRAYJOIN({איש קשר}))` — this joins the array to a string then searches.

**Warning signs:** Empty result set when filtering by contact ID.

### Pitfall 2: `server-only` Import in Client Components

**What goes wrong:** If `contacts.ts` is imported directly in a client component, the `import 'server-only'` in `client.ts` throws a build error.

**Why it happens:** `airtable/client.ts` imports `server-only` as a guard. Any module that imports from `client.ts` inherits this constraint.

**How to avoid:** Never import Airtable service functions from `'use client'` components. Always go through Server Actions (`'use server'`) or Server Components.

**Warning signs:** Build error mentioning `server-only` package in a client component tree.

### Pitfall 3: `revalidatePath` after `createContact()`

**What goes wrong:** After adding a contact, the contacts page shows stale data (the new contact doesn't appear).

**Why it happens:** Next.js App Router caches server component renders. Without `revalidatePath('/anshei-kesher')`, the server component doesn't re-fetch.

**How to avoid:** Call `revalidatePath('/anshei-kesher')` at the end of the `addContact()` Server Action before returning success.

**Warning signs:** New contact doesn't appear on page after successful add without refresh.

### Pitfall 4: Phone Format Mismatch in Duplicate Check

**What goes wrong:** User enters "050-123-4567", existing record is stored as "972501234567" — duplicate check fails to detect the duplicate.

**Why it happens:** Comparison is done on raw strings without normalization.

**How to avoid:** Always normalize both the incoming phone AND the existing phones before comparing. The `normalizePhone()` utility must be called on both sides of the comparison.

**Warning signs:** Duplicate contacts with the same number in different formats.

### Pitfall 5: RTL Table Column Order

**What goes wrong:** Table renders with columns in wrong visual order in RTL.

**Why it happens:** `dir="rtl"` causes the browser to render `<td>` cells right-to-left. If you define columns left-to-right in JSX expecting LTR, they'll appear reversed in RTL.

**How to avoid:** In RTL Hebrew UI, the first `<th>/<td>` in JSX is the rightmost visual column. Design column order intentionally: first in JSX = rightmost on screen. The natural order for this table: שם מלא (rightmost), טלפון, תאריך הצטרפות, קמפיין (leftmost).

**Warning signs:** Column headers don't match their data column visually.

### Pitfall 6: MAKE.com Webhook Payload Shape Unknown

**What goes wrong:** Webhook handler assumes `{ full_name, phone }` but MAKE.com sends a different shape.

**Why it happens:** MAKE.com scenario configuration determines the payload structure — it's not standardized.

**How to avoid:** Design the webhook to accept multiple possible field names (or document the expected shape clearly). Be defensive: validate and return 400 with a descriptive error for missing fields. Coordinate with MAKE.com scenario designer (Michal or whoever sets it up) to confirm field names.

**Warning signs:** 400 errors from the webhook endpoint after MAKE.com sends data.

---

## Code Examples

Verified patterns from existing codebase:

### Existing getContacts() — established pattern to follow

```typescript
// src/lib/airtable/contacts.ts (existing)
export async function getContacts(): Promise<Contact[]> {
  const records = await airtableBase('Contacts')
    .select({ sort: [{ field: 'נוצר בתאריך', direction: 'desc' }] })
    .all();
  return records.map((r) => ({ ... }));
}
```

### Sheet component usage — established pattern

```typescript
// From src/components/layout/Sidebar.tsx and sheet.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// Side "right" or "left" — in RTL, use "left" for a detail panel that slides in from left
// (since left = the logical end of the screen in RTL). Use "right" for the far end.
<Sheet open={!!selectedContact} onOpenChange={(o) => !o && setSelectedContact(null)}>
  <SheetContent side="left">
    <SheetHeader>
      <SheetTitle>{selectedContact?.full_name}</SheetTitle>
    </SheetHeader>
    {/* panel content */}
  </SheetContent>
</Sheet>
```

### Card stat pattern — from src/app/page.tsx

```typescript
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      סך אנשי קשר
    </CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-3xl font-bold">{contacts.length}</p>
  </CardContent>
</Card>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router API routes for all data | App Router: Server Components + Server Actions | Next.js 13+ | Server components fetch data directly, no API routes needed for reads |
| shadcn/ui with Radix primitives | base-ui/react Dialog as the primitive | Phase 1 decision | Sheet.tsx already uses base-ui — use same primitive for modal |
| `flex-row-reverse` for RTL | `dir="rtl"` on `<html>`, plain `flex-row` | Phase 1 confirmed | Don't fight the browser |

---

## Open Questions

1. **MAKE.com payload field names**
   - What we know: Webhook will be a POST from MAKE.com
   - What's unclear: Exact JSON field names MAKE.com will send (`full_name`? `name`? `שם מלא`?)
   - Recommendation: Implement the webhook handler to accept a documented schema, document the expected payload in the webhook handler file's comment header, and have Michal configure MAKE.com to match it. Design defensively with clear 400 error messages.

2. **CampaignEnrollments linked field confirmed in Airtable?**
   - What we know: setup-airtable.ts comments say linked fields (קמפיין, איש קשר) must be added manually in Airtable UI after script
   - What's unclear: Whether this was actually done during Phase 1 execution
   - Recommendation: Wave 0 task should verify that `CampaignEnrollments` has `קמפיין` and `איש קשר` linked fields. If not, add them. The `getContactEnrollments()` function depends on this.

3. **WEBHOOK_SECRET env var**
   - What we know: Webhook needs authentication
   - What's unclear: Whether `WEBHOOK_SECRET` is already in `.env.local` / Railway env
   - Recommendation: Add to Wave 0 — generate a secret, add to `.env.local` and Railway env vars.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 + ts-jest |
| Config file | `package.json` (jest key) |
| Quick run command | `npm test -- --testPathPattern="contacts"` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONT-01 | `getContacts()` maps all fields correctly | unit | `npm test -- --testPathPattern="contacts"` | Yes (contacts.test.ts) |
| CONT-01 | `formatPhoneDisplay()` converts 972XXXXXXXXXX → 050-XXX-XXXX | unit | `npm test -- --testPathPattern="phone"` | No — Wave 0 |
| CONT-01 | `normalizePhone()` handles 050-, 0, +972, 972 prefixes | unit | `npm test -- --testPathPattern="phone"` | No — Wave 0 |
| CONT-02 | `getContactEnrollments()` filters by contact ID | unit | `npm test -- --testPathPattern="contacts"` | No — Wave 0 |
| CONT-02 | `getContactMessages()` filters by contact ID | unit | `npm test -- --testPathPattern="contacts"` | No — Wave 0 |
| CONT-03 | Stats computed from contacts array (this month / this week) | unit | `npm test -- --testPathPattern="contacts"` | No — Wave 0 |
| INFRA-04 | Webhook returns 401 with wrong secret | unit | `npm test -- --testPathPattern="webhook"` | No — Wave 0 |
| INFRA-04 | Webhook returns 400 with missing fields | unit | `npm test -- --testPathPattern="webhook"` | No — Wave 0 |
| INFRA-04 | Webhook normalizes phone before storing | unit | `npm test -- --testPathPattern="webhook"` | No — Wave 0 |
| UX-01 | `addContact()` returns error for duplicate phone | unit | `npm test -- --testPathPattern="actions"` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test -- --testPathPattern="(contacts|phone)"`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/airtable/__tests__/phone.test.ts` — covers normalizePhone, formatPhoneDisplay (CONT-01, INFRA-04)
- [ ] `src/lib/airtable/__tests__/contacts.test.ts` — extend existing file for getContactEnrollments, getContactMessages (CONT-02)
- [ ] `src/app/api/webhook/contact/__tests__/route.test.ts` — covers INFRA-04 webhook handler
- [ ] `src/app/anshei-kesher/__tests__/actions.test.ts` — covers addContact duplicate check (UX-01)
- [ ] `src/lib/airtable/phone.ts` — new file (utility under test)
- [ ] `WEBHOOK_SECRET` added to `.env.local` — needed for webhook tests and runtime

---

## Sources

### Primary (HIGH confidence)

- Codebase: `src/lib/airtable/contacts.ts` — existing `getContacts()`, `getContactById()` patterns
- Codebase: `src/lib/airtable/types.ts` — Contact, CampaignEnrollment, ScheduledMessage interfaces
- Codebase: `src/lib/airtable/client.ts` — `server-only` guard pattern
- Codebase: `src/components/ui/sheet.tsx` — Sheet component using `@base-ui/react/dialog`
- Codebase: `src/components/ui/card.tsx` — Card components
- Codebase: `scripts/setup-airtable.ts` — Airtable field names (Hebrew), table structure, linked field notes
- Codebase: `package.json` jest config — test framework configuration, test path patterns
- Codebase: `src/app/page.tsx` — stat card pattern used on dashboard
- Codebase: `src/app/layout.tsx` — `dir="rtl"` layout pattern confirmed

### Secondary (MEDIUM confidence)

- Next.js 16 App Router docs (server actions, revalidatePath, Route Handlers) — patterns match project's established usage
- Airtable formula docs: `FIND` + `ARRAYJOIN` pattern for filtering linked records — standard documented approach

### Tertiary (LOW confidence)

- MAKE.com webhook payload structure: unknown — assumed field names `full_name`, `phone` pending Michal's MAKE.com scenario configuration

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — entire stack already installed and in use; no new dependencies
- Architecture: HIGH — patterns directly observed in existing codebase
- Airtable field names: HIGH — confirmed from setup-airtable.ts source of truth
- Pitfalls: HIGH for server-only/revalidation/duplicate check (established patterns); MEDIUM for linked record formula (documented but not yet exercised in this codebase)
- MAKE.com payload: LOW — external system, shape unknown

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable stack — 30 days)
