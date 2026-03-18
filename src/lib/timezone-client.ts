/**
 * Client-safe DST-aware timezone utilities for live preview in browser.
 * This file is intentionally NOT marked server-only — it runs in the browser
 * for live send-time preview in CampaignSheet.
 *
 * The same logic exists in src/lib/airtable/timezone.ts (server-only) which is
 * the authoritative version called when saving to Airtable.
 */

type OffsetLabel = 'week_before' | 'day_before' | 'morning' | 'half_hour';

/**
 * Convert a local Israel date + time to UTC ISO8601.
 * DST-safe: uses Intl.DateTimeFormat to verify the actual Jerusalem wall clock.
 */
export function localIsraelToUTC(dateISO: string, timeHHMM: string): string {
  const [year, month, day] = dateISO.split('-').map(Number);
  const [hour, minute] = timeHHMM.split(':').map(Number);

  // Estimate UTC assuming UTC+2 (standard offset)
  let utc = new Date(Date.UTC(year, month - 1, day, hour - 2, minute));

  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = fmt.formatToParts(utc);
  const displayedHour = Number(parts.find((p) => p.type === 'hour')!.value);
  const diff = hour - displayedHour;

  if (diff !== 0) {
    utc = new Date(utc.getTime() + diff * 60 * 60 * 1000);
  }

  return utc.toISOString();
}

/**
 * Compute the UTC send_at timestamp for a scheduled message slot.
 * Client-safe version for live preview.
 */
export function computeSendAt(
  eventDateISO: string,
  eventTimeHHMM: string,
  offset: OffsetLabel,
  userChosenHour?: string,
): string {
  type OffsetConfig = { daysOffset: number; fixedHour: number | null };

  const OFFSET_CONFIGS: Record<OffsetLabel, OffsetConfig> = {
    week_before: { daysOffset: -7, fixedHour: 9 },
    day_before:  { daysOffset: -1, fixedHour: 9 },
    morning:     { daysOffset: 0,  fixedHour: null },
    half_hour:   { daysOffset: 0,  fixedHour: null },
  };

  const config = OFFSET_CONFIGS[offset];
  const [year, month, day] = eventDateISO.split('-').map(Number);

  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + config.daysOffset);
  const adjustedDateISO = d.toISOString().slice(0, 10);

  let localTime: string;

  if (offset === 'half_hour') {
    const [eh, em] = eventTimeHHMM.split(':').map(Number);
    const totalMin = eh * 60 + em - 30;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    localTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  } else if (config.fixedHour !== null) {
    localTime = `${String(config.fixedHour).padStart(2, '0')}:00`;
  } else {
    localTime = userChosenHour ?? '09:00';
  }

  return localIsraelToUTC(adjustedDateISO, localTime);
}

/**
 * Format a UTC ISO string as an Israeli-locale send preview string.
 * Returns empty string for null/empty input.
 */
export function formatSendPreview(send_at_utc: string | null | undefined): string {
  if (!send_at_utc) return '';
  const d = new Date(send_at_utc);
  const date = d.toLocaleDateString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: 'numeric',
    month: 'numeric',
  });
  const time = d.toLocaleTimeString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `יישלח ב-${date} בשעה ${time}`;
}

/**
 * Compute the half_hour slot display time (event_time - 30 min) in HH:MM format.
 */
export function computeHalfHourTime(eventTimeHHMM: string): string {
  const [eh, em] = eventTimeHHMM.split(':').map(Number);
  const totalMin = eh * 60 + em - 30;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
