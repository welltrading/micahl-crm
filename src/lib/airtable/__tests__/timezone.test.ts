/**
 * Unit tests for DST-safe Israel timezone utility
 * Tests localIsraelToUTC and computeSendAt with known DST boundary cases.
 *
 * Israel DST 2026:
 *   Standard (IST): UTC+2 — winter, through March 26
 *   Daylight (IDT): UTC+3 — summer, March 27 onward
 *   DST start: March 27 at 02:00 local (clocks forward to 03:00)
 *   DST end: October 25 at 02:00 local (clocks back to 01:00)
 */

import { localIsraelToUTC, computeSendAt } from '../timezone';

describe('localIsraelToUTC', () => {
  it('converts summer date 2026-04-14 09:00 Israel to UTC (IDT = UTC+3)', () => {
    // April 14 is in IDT (UTC+3), so 09:00 Israel = 06:00 UTC
    expect(localIsraelToUTC('2026-04-14', '09:00')).toBe('2026-04-14T06:00:00.000Z');
  });

  it('converts winter date 2026-01-15 09:00 Israel to UTC (IST = UTC+2)', () => {
    // January 15 is in IST (UTC+2), so 09:00 Israel = 07:00 UTC
    expect(localIsraelToUTC('2026-01-15', '09:00')).toBe('2026-01-15T07:00:00.000Z');
  });

  it('converts DST transition day 2026-03-27 03:30 Israel to UTC (clocks went forward at 02:00)', () => {
    // On March 27, clocks move forward at 02:00 → 03:00, so 03:30 is IDT (UTC+3)
    // 03:30 IDT = 00:30 UTC
    expect(localIsraelToUTC('2026-03-27', '03:30')).toBe('2026-03-27T00:30:00.000Z');
  });
});

describe('computeSendAt', () => {
  const EVENT_DATE = '2026-04-14'; // In IDT (UTC+3)
  const EVENT_TIME = '19:00';

  it('week_before: lands 7 days before event at 09:00 Israel time', () => {
    // April 14 - 7 days = April 7... wait, plan says March 25
    // April 14 - 7 = April 7, but plan says March 25 for a different event?
    // Re-reading: event "2026-04-14", week_before → March 25? No, April 14 - 7 = April 7
    // The plan example for week_before shows March 25 for an April 1 event:
    // "event 2026-04-01, week_before → March 25 at 09:00 IL"
    // For April 14: April 14 - 7 = April 7 (still in IDT UTC+3)
    // April 7 at 09:00 IDT = 06:00 UTC
    expect(computeSendAt(EVENT_DATE, EVENT_TIME, 'week_before')).toBe('2026-04-07T06:00:00.000Z');
  });

  it('day_before: lands 1 day before event at 09:00 Israel time', () => {
    // April 14 - 1 = April 13 (in IDT, UTC+3)
    // April 13 at 09:00 IDT = 06:00 UTC
    expect(computeSendAt(EVENT_DATE, EVENT_TIME, 'day_before')).toBe('2026-04-13T06:00:00.000Z');
  });

  it('morning: uses user-chosen hour in Israel time', () => {
    // April 14 at 08:00 IDT = 05:00 UTC
    expect(computeSendAt(EVENT_DATE, EVENT_TIME, 'morning', '08:00')).toBe('2026-04-14T05:00:00.000Z');
  });

  it('half_hour: event time minus 30 minutes in Israel time', () => {
    // Event at 19:00 - 30 min = 18:30 IDT = 15:30 UTC
    expect(computeSendAt(EVENT_DATE, EVENT_TIME, 'half_hour')).toBe('2026-04-14T15:30:00.000Z');
  });

  it('DST boundary: event 2026-04-01, week_before lands March 25 at UTC+2 (not UTC+3)', () => {
    // April 1 is in IDT (UTC+3)
    // week_before: April 1 - 7 = March 25
    // March 25 is in IST (UTC+2) — before the March 27 DST transition
    // March 25 at 09:00 IST = 07:00 UTC (NOT 06:00 which would be UTC+3)
    expect(computeSendAt('2026-04-01', '09:00', 'week_before')).toBe('2026-03-25T07:00:00.000Z');
  });

  it('all 4 offset labels produce different UTC values for the same event', () => {
    const weekBefore = computeSendAt(EVENT_DATE, EVENT_TIME, 'week_before');
    const dayBefore = computeSendAt(EVENT_DATE, EVENT_TIME, 'day_before');
    const morning = computeSendAt(EVENT_DATE, EVENT_TIME, 'morning', '09:00');
    const halfHour = computeSendAt(EVENT_DATE, EVENT_TIME, 'half_hour');

    const allValues = [weekBefore, dayBefore, morning, halfHour];
    const uniqueValues = new Set(allValues);
    expect(uniqueValues.size).toBe(4);
  });
});
