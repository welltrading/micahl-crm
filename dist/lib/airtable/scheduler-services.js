"use strict";
/**
 * Scheduler service layer — Airtable operations for the message scheduler.
 * NO 'server-only' import — this file is used by Bree worker threads (plain Node.js).
 * Uses relative imports only (no @/ aliases) for worker thread compatibility.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPendingMessagesDue = getPendingMessagesDue;
exports.markMessageSending = markMessageSending;
exports.markMessageSent = markMessageSent;
exports.markMessageFailed = markMessageFailed;
exports.resetStuckSendingMessages = resetStuckSendingMessages;
exports.getEnrollmentsForCampaign = getEnrollmentsForCampaign;
const client_1 = require("./client");
// Hebrew field names for ScheduledMessages table
const STATUS_FIELD = 'סטטוס';
const SEND_AT_FIELD = 'שליחה בשעה';
const SENT_AT_FIELD = 'נשלח בשעה';
const CONTENT_FIELD = 'תוכן ההודעה';
const TITLE_FIELD = 'כותרת';
const CAMPAIGN_FIELD = 'קמפיין';
const CONTACT_FIELD = 'איש קשר';
const SLOT_FIELD = 'מספר הודעה';
// Hebrew status values
const STATUS_PENDING = 'ממתינה';
const STATUS_SENDING = 'בשליחה';
const STATUS_SENT = 'נשלחה';
const STATUS_FAILED = 'נכשלה';
function mapAirtableStatus(hebrewStatus) {
    switch (hebrewStatus) {
        case STATUS_SENDING:
            return 'sending';
        case STATUS_SENT:
            return 'sent';
        case STATUS_FAILED:
            return 'failed';
        default:
            return 'pending';
    }
}
function mapRecord(record) {
    var _a, _b, _c, _d, _e, _f;
    const f = record.fields;
    return {
        id: record.id,
        campaign_id: (_a = f[CAMPAIGN_FIELD]) !== null && _a !== void 0 ? _a : [],
        contact_id: (_b = f[CONTACT_FIELD]) !== null && _b !== void 0 ? _b : [],
        title: (_c = f[TITLE_FIELD]) !== null && _c !== void 0 ? _c : '',
        message_content: (_d = f[CONTENT_FIELD]) !== null && _d !== void 0 ? _d : '',
        send_date: '',
        send_time: '',
        slot_index: Number((_e = f[SLOT_FIELD]) !== null && _e !== void 0 ? _e : 0),
        status: mapAirtableStatus(f[STATUS_FIELD]),
        sent_at: (_f = f[SENT_AT_FIELD]) !== null && _f !== void 0 ? _f : undefined,
    };
}
/**
 * Fetch all ScheduledMessages with status 'ממתינה' whose send time is before nowIso.
 */
async function getPendingMessagesDue(nowIso) {
    const formula = `AND({${STATUS_FIELD}} = '${STATUS_PENDING}', IS_BEFORE({${SEND_AT_FIELD}}, NOW()))`;
    const records = await (0, client_1.airtableBase)('ScheduledMessages')
        .select({ filterByFormula: formula })
        .all();
    return records.map(mapRecord);
}
/**
 * Mark a ScheduledMessage as 'בשליחה' (sending) — idempotent transition lock.
 */
async function markMessageSending(id) {
    await (0, client_1.airtableBase)('ScheduledMessages').update(id, { [STATUS_FIELD]: STATUS_SENDING });
}
/**
 * Mark a ScheduledMessage as 'נשלחה' (sent) and record the sent timestamp.
 */
async function markMessageSent(id) {
    await (0, client_1.airtableBase)('ScheduledMessages').update(id, {
        [STATUS_FIELD]: STATUS_SENT,
        [SENT_AT_FIELD]: new Date().toISOString(),
    });
}
/**
 * Mark a ScheduledMessage as 'נכשלה' (failed).
 */
async function markMessageFailed(id) {
    await (0, client_1.airtableBase)('ScheduledMessages').update(id, { [STATUS_FIELD]: STATUS_FAILED });
}
/**
 * Reset any messages stuck in 'בשליחה' status back to 'ממתינה'.
 * Called on scheduler startup to recover from crashes.
 */
async function resetStuckSendingMessages() {
    const formula = `{${STATUS_FIELD}} = '${STATUS_SENDING}'`;
    const records = await (0, client_1.airtableBase)('ScheduledMessages')
        .select({ filterByFormula: formula })
        .all();
    for (const record of records) {
        await (0, client_1.airtableBase)('ScheduledMessages').update(record.id, {
            [STATUS_FIELD]: STATUS_PENDING,
        });
    }
}
/**
 * Fetch all CampaignEnrollments for a given campaign ID.
 * Uses FIND+ARRAYJOIN pattern required for Airtable linked record filtering.
 */
async function getEnrollmentsForCampaign(campaignId) {
    const formula = `FIND("${campaignId}", ARRAYJOIN({${CAMPAIGN_FIELD}}))`;
    const records = await (0, client_1.airtableBase)('CampaignEnrollments')
        .select({ filterByFormula: formula })
        .all();
    return records.map((record) => {
        var _a, _b, _c;
        const f = record.fields;
        const rawSource = f['מקור'];
        const source = rawSource === 'Webhook' ? 'webhook' : 'manual';
        return {
            id: record.id,
            campaign_id: (_a = f[CAMPAIGN_FIELD]) !== null && _a !== void 0 ? _a : [],
            contact_id: (_b = f[CONTACT_FIELD]) !== null && _b !== void 0 ? _b : [],
            enrolled_at: (_c = f['תאריך רישום']) !== null && _c !== void 0 ? _c : undefined,
            source,
        };
    });
}
