/**
 * POST /api/webhook/contact
 *
 * MAKE.com webhook endpoint — creates a new contact in Airtable when someone
 * signs up externally. Called automatically by MAKE.com; Michal sees the
 * contact on next page refresh (no revalidation needed).
 *
 * Authentication: x-webhook-secret header (keeps secret out of server logs).
 *
 * Expected MAKE.com payload (preferred):
 * {
 *   "first_name": "string (required)",
 *   "last_name":  "string (required)",
 *   "phone":      "string (required)",
 *   "email":      "string (optional)",
 *   "campaign":   "string (optional, Airtable campaign record ID)"
 * }
 *
 * Legacy fallback (full_name split on first space):
 * {
 *   "full_name": "string (required)",
 *   "phone":     "string (required)"
 * }
 *
 * Logic:
 *   - Contact always created in מתעניינות
 *   - If campaign provided AND campaign is free (חינמי) → also create enrollment in נרשמות
 *   - If campaign is paid (בתשלום) → only מתעניינות (Make handles enrollment after payment)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createContact, createEnrollment } from '@/lib/airtable/contacts';
import { getCampaignById } from '@/lib/airtable/campaigns';
import { normalizePhone } from '@/lib/airtable/phone';

export async function POST(req: NextRequest) {
  // --- Authentication ---
  const incomingSecret = req.headers.get('x-webhook-secret');
  if (!incomingSecret || incomingSecret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- Parse body ---
  let body: { first_name?: unknown; last_name?: unknown; full_name?: unknown; phone?: unknown; email?: unknown; campaign?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { phone, email } = body;

  // --- Resolve first/last name ---
  let firstName: string;
  let lastName: string;

  if (body.first_name && typeof body.first_name === 'string' && body.first_name.trim()) {
    firstName = body.first_name.trim();
    lastName = typeof body.last_name === 'string' ? body.last_name.trim() : '';
  } else if (body.full_name && typeof body.full_name === 'string' && body.full_name.trim()) {
    const parts = body.full_name.trim().split(/\s+/);
    firstName = parts[0];
    lastName = parts.slice(1).join(' ');
  } else {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // --- Normalize phone ---
  const normalizedPhone = normalizePhone(phone);

  // --- Create contact in מתעניינות ---
  const { id: contactId } = await createContact({
    first_name: firstName,
    last_name: lastName,
    phone: normalizedPhone,
    email: email && typeof email === 'string' && email.trim() ? email.trim() : undefined,
  });

  // --- Auto-enroll if campaign is free ---
  const campaignId = body.campaign && typeof body.campaign === 'string' ? body.campaign.trim() : null;
  if (campaignId) {
    const campaign = await getCampaignById(campaignId);
    if (campaign && campaign.campaign_type === 'free') {
      await createEnrollment(contactId, campaignId);
    }
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
