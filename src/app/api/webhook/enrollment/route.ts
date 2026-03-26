/**
 * POST /api/webhook/enrollment
 *
 * Called by MAKE.com when a payment is confirmed by the payment processor.
 * Finds the contact by phone or email and creates an enrollment in נרשמות.
 *
 * Authentication: x-webhook-secret header.
 *
 * Expected payload:
 * {
 *   "phone":       "string (required if no email)",
 *   "email":       "string (required if no phone)",
 *   "campaign_id": "string (required, Airtable campaign record ID)"
 * }
 *
 * Returns:
 *   201 { success: true, enrollment_id: "..." }
 *   400 if missing fields or contact not found
 *   401 if unauthorized
 */

import { NextRequest, NextResponse } from 'next/server';
import { getContacts, createEnrollment } from '@/lib/airtable/contacts';
import { normalizePhone } from '@/lib/airtable/phone';

export async function POST(req: NextRequest) {
  // --- Authentication ---
  const incomingSecret = req.headers.get('x-webhook-secret');
  if (!incomingSecret || incomingSecret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- Parse body ---
  let body: { phone?: unknown; email?: unknown; campaign_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const campaignId = typeof body.campaign_id === 'string' ? body.campaign_id.trim() : '';
  if (!campaignId) {
    return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 });
  }

  const rawPhone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!rawPhone && !rawEmail) {
    return NextResponse.json({ error: 'phone or email is required' }, { status: 400 });
  }

  // --- Find contact ---
  const contacts = await getContacts();

  let normalizedPhone = '';
  if (rawPhone) {
    try { normalizedPhone = normalizePhone(rawPhone); } catch { /* ignore */ }
  }

  const contact = contacts.find((c) => {
    if (normalizedPhone && c.phone === normalizedPhone) return true;
    if (rawEmail && c.email?.toLowerCase() === rawEmail) return true;
    return false;
  });

  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 400 });
  }

  // --- Create enrollment ---
  await createEnrollment(contact.id, campaignId);

  return NextResponse.json({ success: true }, { status: 201 });
}
