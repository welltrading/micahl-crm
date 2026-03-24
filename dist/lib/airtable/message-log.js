"use strict";
/**
 * Message log service — creates audit records after send attempts.
 * NO 'server-only' import — used by Bree worker threads (plain Node.js).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMessageLogEntry = createMessageLogEntry;
const client_1 = require("./client");
/**
 * Create a record in the MessageLog Airtable table.
 * Hebrew field name mapping:
 *   'סטטוס'              — 'נשלחה' | 'נכשלה'
 *   'הודעה מתוזמנת'      — linked: [scheduled_message_id]
 *   'איש קשר'            — linked: [contact_id]
 *   'קמפיין'             — linked: [campaign_id]
 *   'תגובת GREEN API'    — green_api_response
 *   'הודעת שגיאה'        — error_message
 */
async function createMessageLogEntry(entry) {
    const hebrewStatus = entry.status === 'sent' ? 'נשלחה' : 'נכשלה';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fields = {
        'סטטוס': hebrewStatus,
        'הודעה מתוזמנת': [entry.scheduled_message_id],
        'איש קשר': [entry.contact_id],
        'קמפיין': [entry.campaign_id],
    };
    if (entry.green_api_response !== undefined) {
        fields['תגובת GREEN API'] = entry.green_api_response;
    }
    if (entry.error_message !== undefined) {
        fields['הודעת שגיאה'] = entry.error_message;
    }
    await (0, client_1.airtableBase)('MessageLog').create(fields);
}
