"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveCampaignStatus = deriveCampaignStatus;
exports.getCampaigns = getCampaigns;
exports.getCampaignById = getCampaignById;
exports.createCampaign = createCampaign;
exports.getEnrollmentCountsByCampaign = getEnrollmentCountsByCampaign;
exports.deleteCampaign = deleteCampaign;
const client_1 = require("./client");
// Airtable field names are Hebrew (as set up in Plan 02 schema)
// API field name = Hebrew display name in this project
function deriveCampaignStatus(eventDateISO) {
    const now = new Date();
    const eventDate = new Date(eventDateISO);
    const dayAfterEvent = new Date(eventDate);
    dayAfterEvent.setUTCDate(dayAfterEvent.getUTCDate() + 1);
    if (now < eventDate)
        return 'future';
    if (now < dayAfterEvent)
        return 'active';
    return 'ended';
}
async function getCampaigns() {
    const records = await (0, client_1.airtableBase)('Campaigns')
        .select({
        sort: [{ field: 'תאריך אירוע', direction: 'desc' }],
    })
        .all();
    return records.map((r) => ({
        id: r.id,
        campaign_name: r.fields['שם קמפיין'],
        event_date: r.fields['תאריך אירוע'],
        event_time: r.fields['שעת האירוע'],
        description: r.fields['תיאור'],
        status: deriveCampaignStatus(r.fields['תאריך אירוע']),
        created_at: r.fields['נוצר בתאריך'],
    }));
}
async function getCampaignById(id) {
    try {
        const record = await (0, client_1.airtableBase)('Campaigns').find(id);
        return {
            id: record.id,
            campaign_name: record.fields['שם קמפיין'],
            event_date: record.fields['תאריך אירוע'],
            event_time: record.fields['שעת האירוע'],
            description: record.fields['תיאור'],
            status: deriveCampaignStatus(record.fields['תאריך אירוע']),
            created_at: record.fields['נוצר בתאריך'],
        };
    }
    catch (_a) {
        return null;
    }
}
async function createCampaign(params) {
    var _a;
    const record = await (0, client_1.airtableBase)('Campaigns').create(Object.assign(Object.assign({ 'שם קמפיין': params.campaign_name, 'תאריך אירוע': params.event_date }, (params.event_time !== undefined ? { 'שעת האירוע': params.event_time } : {})), { 'תיאור': (_a = params.description) !== null && _a !== void 0 ? _a : '' }));
    return {
        id: record.id,
        campaign_name: record.fields['שם קמפיין'],
        event_date: record.fields['תאריך אירוע'],
        event_time: record.fields['שעת האירוע'],
        description: record.fields['תיאור'],
        status: deriveCampaignStatus(record.fields['תאריך אירוע']),
        created_at: record.fields['נוצר בתאריך'],
    };
}
async function getEnrollmentCountsByCampaign() {
    var _a;
    const records = await (0, client_1.airtableBase)('CampaignEnrollments')
        .select({ fields: ['קמפיין'] })
        .all();
    const counts = {};
    for (const r of records) {
        const campaignIds = r.fields['קמפיין'];
        if (campaignIds) {
            for (const id of campaignIds) {
                counts[id] = ((_a = counts[id]) !== null && _a !== void 0 ? _a : 0) + 1;
            }
        }
    }
    return counts;
}
async function deleteCampaign(campaignId) {
    await (0, client_1.airtableBase)('Campaigns').destroy(campaignId);
}
