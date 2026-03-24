"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.localIsraelToUTC = localIsraelToUTC;
exports.computeSendAt = computeSendAt;
require("server-only");
/**
 * DST-safe UTC conversion for Israel timezone (Asia/Jerusalem).
 *
 * Israel Standard Time (IST): UTC+2 — winter (roughly October–March)
 * Israel Daylight Time (IDT): UTC+3 — summer (roughly March–October)
 * 2026 DST start: March 27 at 02:00 local (clocks forward to 03:00)
 * 2026 DST end:   October 25 at 02:00 local (clocks back to 01:00)
 *
 * Approach: Intl.DateTimeFormat with 'Asia/Jerusalem' — zero dependencies.
 * Uses iterative correction to find the exact UTC moment when Jerusalem
 * displays the target local time.
 */
/**
 * Convert a local Israel date + time to UTC ISO8601.
 *
 * @param dateISO  - Date string in YYYY-MM-DD format (treated as Jerusalem date)
 * @param timeHHMM - Local time in HH:MM format (24-hour, Jerusalem wall clock)
 * @returns UTC ISO8601 string, e.g. "2026-04-14T06:00:00.000Z"
 */
function localIsraelToUTC(dateISO, timeHHMM) {
    const [year, month, day] = dateISO.split('-').map(Number);
    const [hour, minute] = timeHHMM.split(':').map(Number);
    // Step 1: Estimate UTC assuming UTC+2 (standard offset — common case)
    let utc = new Date(Date.UTC(year, month - 1, day, hour - 2, minute));
    // Step 2: Format that UTC moment back to Jerusalem wall clock time
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jerusalem',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    // Step 3: Compare displayed Jerusalem hour to desired hour; adjust if DST differs
    const parts = fmt.formatToParts(utc);
    const displayedHour = Number(parts.find((p) => p.type === 'hour').value);
    const diff = hour - displayedHour;
    if (diff !== 0) {
        // Adjust UTC so Jerusalem displays the correct hour.
        // diff = target - displayed; if displayed is ahead, diff is negative, we add it to UTC.
        // Example: target=09, displayed=10, diff=-1 → utc = 07:00 + (-1h) = 06:00 ✓
        utc = new Date(utc.getTime() + diff * 60 * 60 * 1000);
    }
    return utc.toISOString();
}
function computeSendAt(eventDateISO, eventTimeHHMM, offset, userChosenHour) {
    const OFFSET_CONFIGS = {
        week_before: { daysOffset: -7, fixedHour: 9 }, // 09:00 fixed
        day_before: { daysOffset: -1, fixedHour: 9 }, // 09:00 fixed
        morning: { daysOffset: 0, fixedHour: null }, // user-chosen
        half_hour: { daysOffset: 0, fixedHour: null }, // event_time - 30 min
    };
    const config = OFFSET_CONFIGS[offset];
    const [year, month, day] = eventDateISO.split('-').map(Number);
    // Adjust date by daysOffset using UTC date arithmetic
    const d = new Date(Date.UTC(year, month - 1, day));
    d.setUTCDate(d.getUTCDate() + config.daysOffset);
    const adjustedDateISO = d.toISOString().slice(0, 10); // YYYY-MM-DD
    // Determine local Israel time for the adjusted date
    let localTime;
    if (offset === 'half_hour') {
        // Subtract 30 minutes from event time (arithmetic in minutes)
        const [eh, em] = eventTimeHHMM.split(':').map(Number);
        const totalMin = eh * 60 + em - 30;
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        localTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    else if (config.fixedHour !== null) {
        localTime = `${String(config.fixedHour).padStart(2, '0')}:00`;
    }
    else {
        // morning: use user-chosen hour
        localTime = userChosenHour;
    }
    // Convert local Jerusalem time to UTC — DST-safe
    return localIsraelToUTC(adjustedDateISO, localTime);
}
