/**
 * Phone utility functions for Israeli mobile numbers.
 * No external imports — pure functions.
 *
 * Normalized format: 972XXXXXXXXXX (12 digits, country code 972 + 9-digit local)
 * Israeli mobile numbers always start with 05X locally.
 */

/**
 * Normalizes any Israeli mobile phone format to 972XXXXXXXXXX.
 *
 * Supported input formats:
 *  - 050-123-4567  (dashed local)
 *  - 0501234567    (local no dashes)
 *  - +972501234567 (E.164 with +)
 *  - 972501234567  (already normalized)
 *
 * Throws if input is empty or unrecognizable.
 */
export function normalizePhone(phone: string): string {
  if (!phone || phone.trim() === '') {
    throw new Error('Phone number cannot be empty');
  }

  // Strip all non-digit characters except leading + (handled separately)
  const stripped = phone.replace(/[^\d+]/g, '');

  // Already normalized: 972 + 9 digits = 12 digits
  if (/^972\d{9}$/.test(stripped)) {
    return stripped;
  }

  // E.164 format: +972XXXXXXXXX
  if (/^\+972\d{9}$/.test(stripped)) {
    return stripped.slice(1); // remove leading +
  }

  // Local format with leading 0: 05XXXXXXXXX (10 digits)
  if (/^0\d{9}$/.test(stripped)) {
    return '972' + stripped.slice(1); // replace leading 0 with 972
  }

  throw new Error(`Cannot normalize phone number: "${phone}"`);
}

/**
 * Formats a normalized 972XXXXXXXXXX phone number for UI display.
 * Output format: 0XX-XXX-XXXX
 *
 * Example: 972501234567 → 050-123-4567
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';
  // Normalize first so any input format (e.g. "(052) 229-7909" from Airtable) works
  let normalized: string;
  try {
    normalized = normalizePhone(phone);
  } catch {
    return phone; // unrecognized format — show as-is
  }
  // normalized: 972 + 9 digits → display as 0XX-XXX-XXXX
  const local = '0' + normalized.slice(3);
  return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
}
