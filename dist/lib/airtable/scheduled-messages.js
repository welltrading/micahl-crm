"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getScheduledMessagesByCampaign = getScheduledMessagesByCampaign;
exports.upsertScheduledMessages = upsertScheduledMessages;
exports.createScheduledMessage = createScheduledMessage;
exports.updateScheduledMessage = updateScheduledMessage;
require("server-only");
const client_1 = require("./client");
async function getScheduledMessagesByCampaign(campaignId) {
    const records = await (0, client_1.airtableBase)('ScheduledMessages')
        .select({
        filterByFormula: `FIND("${campaignId}", ARRAYJOIN({קמפיין}))`,
        sort: [{ field: 'מספר הודעה', direction: 'asc' }],
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
            slot_index: Number(r.fields['מספר הודעה']) || 0,
            status: (_f = r.fields['סטטוס']) !== null && _f !== void 0 ? _f : 'pending',
            sent_at: r.fields['נשלח בשעה'],
        });
    });
}
async function upsertScheduledMessages(campaignId, slots) {
    var _a, _b, _c;
    const filled = slots.filter((s) => s.message_content.trim() !== '');
    if (filled.length === 0)
        return;
    // Fetch existing records for this campaign
    const existing = await (0, client_1.airtableBase)('ScheduledMessages')
        .select({ filterByFormula: `FIND("${campaignId}", ARRAYJOIN({קמפיין}))` })
        .all();
    // Group by slot_index — may have duplicates from past bugs
    const bySlot = new Map(); // slot_index → [recordId, ...]
    for (const r of existing) {
        const idx = Number(r.fields['מספר הודעה']);
        console.log('[upsert] existing record:', r.id, 'מספר הודעה raw:', r.fields['מספר הודעה'], '→ idx:', idx);
        if (idx) {
            const arr = (_a = bySlot.get(idx)) !== null && _a !== void 0 ? _a : [];
            arr.push(r.id);
            bySlot.set(idx, arr);
        }
    }
    console.log('[upsert] bySlot:', Object.fromEntries(bySlot));
    console.log('[upsert] incoming slots:', slots.map(s => ({ slot_index: s.slot_index, recordId: s.recordId })));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toCreate = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toUpdate = [];
    const toDelete = [];
    for (const slot of filled) {
        const candidates = (_b = bySlot.get(slot.slot_index)) !== null && _b !== void 0 ? _b : [];
        // Pick the record to keep: prefer slot.recordId if provided, else first candidate by slot_index
        const keepId = (_c = slot.recordId) !== null && _c !== void 0 ? _c : candidates[0];
        // All other candidates for this slot_index are duplicates — delete them
        for (const id of candidates) {
            if (id !== keepId)
                toDelete.push(id);
        }
        const sharedFields = {
            'כותרת': slot.title,
            'תוכן ההודעה': slot.message_content,
            'תאריך שליחה': slot.send_date,
            'שעת שליחה': slot.send_time,
        };
        if (keepId) {
            toUpdate.push({ id: keepId, fields: sharedFields });
        }
        else {
            toCreate.push({
                fields: Object.assign(Object.assign({ 'קמפיין': [campaignId] }, sharedFields), { 'מספר הודעה': String(slot.slot_index), 'סטטוס': 'ממתינה' }),
            });
        }
    }
    // Delete duplicates first, then create/update
    if (toDelete.length > 0)
        await (0, client_1.airtableBase)('ScheduledMessages').destroy(toDelete);
    if (toCreate.length > 0)
        await (0, client_1.airtableBase)('ScheduledMessages').create(toCreate);
    if (toUpdate.length > 0)
        await (0, client_1.airtableBase)('ScheduledMessages').update(toUpdate);
}
async function createScheduledMessage(campaignId, slot) {
    const created = await (0, client_1.airtableBase)('ScheduledMessages').create({
        'קמפיין': [campaignId],
        'כותרת': slot.title,
        'תוכן ההודעה': slot.message_content,
        'תאריך שליחה': slot.send_date,
        'שעת שליחה': slot.send_time,
        'מספר הודעה': String(slot.slot_index),
        'סטטוס': 'ממתינה',
    });
    return created.id;
}
async function updateScheduledMessage(recordId, fields) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update = {};
    if (fields.title !== undefined)
        update['כותרת'] = fields.title;
    if (fields.message_content !== undefined)
        update['תוכן ההודעה'] = fields.message_content;
    if (fields.send_date !== undefined)
        update['תאריך שליחה'] = fields.send_date;
    if (fields.send_time !== undefined)
        update['שעת שליחה'] = fields.send_time;
    await (0, client_1.airtableBase)('ScheduledMessages').update(recordId, update);
}
