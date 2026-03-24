"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContacts = getContacts;
exports.getContactById = getContactById;
exports.createContact = createContact;
exports.getContactEnrollments = getContactEnrollments;
exports.getContactMessages = getContactMessages;
const client_1 = require("./client");
const phone_1 = require("./phone");
// Airtable field names are Hebrew (as set up in Plan 02 schema)
// API field name = Hebrew display name in this project
async function getContacts() {
    const records = await (0, client_1.airtableBase)('Contacts')
        .select({
        sort: [{ field: 'נוצר בתאריך', direction: 'desc' }],
    })
        .all();
    return records.map((r) => ({
        id: r.id,
        full_name: r.fields['שם מלא'],
        phone: r.fields['טלפון'],
        joined_date: r.fields['תאריך הצטרפות'],
        notes: r.fields['הערות'],
        created_at: r.fields['נוצר בתאריך'],
    }));
}
async function getContactById(id) {
    try {
        const record = await (0, client_1.airtableBase)('Contacts').find(id);
        return {
            id: record.id,
            full_name: record.fields['שם מלא'],
            phone: record.fields['טלפון'],
            joined_date: record.fields['תאריך הצטרפות'],
            notes: record.fields['הערות'],
            created_at: record.fields['נוצר בתאריך'],
        };
    }
    catch (_a) {
        return null;
    }
}
/**
 * Creates a new contact in Airtable.
 * Normalizes the phone number to 972XXXXXXXXXX before storing.
 * Sets joined_date to today's ISO date.
 */
async function createContact(input) {
    const today = new Date().toISOString().split('T')[0];
    await (0, client_1.airtableBase)('Contacts').create({
        'שם מלא': input.full_name,
        'טלפון': (0, phone_1.normalizePhone)(input.phone),
        'תאריך הצטרפות': today,
    }, { typecast: true });
    return { success: true };
}
/**
 * Returns all CampaignEnrollments linked to a specific contact.
 * Uses FIND + ARRAYJOIN filterByFormula — required for Airtable linked record fields.
 */
async function getContactEnrollments(contactId) {
    const records = await (0, client_1.airtableBase)('CampaignEnrollments')
        .select({
        filterByFormula: `FIND("${contactId}", ARRAYJOIN({איש קשר}))`,
    })
        .all();
    return records.map((r) => ({
        id: r.id,
        campaign_id: r.fields['קמפיין'],
        contact_id: r.fields['איש קשר'],
        enrolled_at: r.fields['תאריך רישום'],
        source: mapEnrollmentSource(r.fields['מקור']),
    }));
}
/**
 * Returns all ScheduledMessages linked to a specific contact.
 * Uses FIND + ARRAYJOIN filterByFormula — required for Airtable linked record fields.
 */
async function getContactMessages(contactId) {
    const records = await (0, client_1.airtableBase)('ScheduledMessages')
        .select({
        filterByFormula: `FIND("${contactId}", ARRAYJOIN({איש קשר}))`,
    })
        .all();
    return records.map((r) => {
        var _a, _b, _c, _d, _e, _f;
        return ({
            id: r.id,
            campaign_id: r.fields['קמפיין'],
            contact_id: ((_a = r.fields['איש קשר']) !== null && _a !== void 0 ? _a : []),
            title: (_b = r.fields['כותרת']) !== null && _b !== void 0 ? _b : '',
            message_content: (_c = r.fields['תוכן ההודעה']) !== null && _c !== void 0 ? _c : '',
            send_date: (_d = r.fields['תאריך שליחה']) !== null && _d !== void 0 ? _d : '',
            send_time: (_e = r.fields['שעת שליחה']) !== null && _e !== void 0 ? _e : '09:00',
            send_at: (_f = r.fields['שליחה בשעה']) !== null && _f !== void 0 ? _f : '',
            slot_index: Number(r.fields['תזמון']) || 0,
            status: mapMessageStatus(r.fields['סטטוס']),
            sent_at: r.fields['נשלח בשעה'],
        });
    });
}
// --- Private helpers ---
function mapEnrollmentSource(source) {
    return source === 'Webhook' ? 'webhook' : 'manual';
}
function mapMessageStatus(status) {
    switch (status) {
        case 'ממתינה':
            return 'pending';
        case 'שולח':
            return 'sending';
        case 'נשלחה':
            return 'sent';
        case 'נכשלה':
            return 'failed';
        default:
            throw new Error(`Unknown message status: "${status}"`);
    }
}
