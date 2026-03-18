/**
 * POST /api/webhook/contact
 *
 * MAKE.com webhook endpoint — creates a new contact in Airtable when someone
 * signs up externally. Called automatically by MAKE.com; Michal sees the
 * contact on next page refresh (no revalidation needed).
 *
 * Authentication: x-webhook-secret header (keeps secret out of server logs).
 *
 * Expected MAKE.com payload:
 * {
 *   "full_name": "string (required)",
 *   "phone":     "string (required)",
 *   "campaign":  "string (optional, Airtable campaign record ID if enrolling)"
 * }
 *
 * Airtable Contacts fields:
 *   'שם מלא'          — full name
 *   'טלפון'           — phone (stored as 972XXXXXXXXXX normalized)
 *   'תאריך הצטרפות'   — join date (YYYY-MM-DD)
 */

import { NextRequest, NextResponse } from 'next/server';
import { airtableBase } from '@/lib/airtable/client';
import { normalizePhone } from '@/lib/airtable/phone';

export async function POST(req: NextRequest) {
  // --- Authentication ---
  const incomingSecret = req.headers.get('x-webhook-secret');
  if (!incomingSecret || incomingSecret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- Parse body ---
  let body: { full_name?: unknown; phone?: unknown; campaign?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { full_name, phone } = body;

  // --- Validate required fields ---
  if (!full_name || typeof full_name !== 'string' || full_name.trim() === '') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // --- Normalize phone ---
  const normalizedPhone = normalizePhone(phone);

  // --- Write to Airtable ---
  const today = new Date().toISOString().split('T')[0];

  await airtableBase('Contacts').create({
    'שם מלא': full_name.trim(),
    'טלפון': normalizedPhone,
    'תאריך הצטרפות': today,
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
