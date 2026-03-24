"use strict";
// Bree worker thread — runs in its own Node.js thread, no Next.js context.
// NO 'use server', NO 'server-only', NO Next.js imports.
// Relative imports only — @/ aliases are not resolved at runtime in worker threads.
Object.defineProperty(exports, "__esModule", { value: true });
const scheduler_services_1 = require("../../lib/airtable/scheduler-services");
const contacts_1 = require("../../lib/airtable/contacts");
const green_api_1 = require("../../lib/airtable/green-api");
const message_log_1 = require("../../lib/airtable/message-log");
const phone_1 = require("../../lib/airtable/phone");
async function run() {
    const now = new Date().toISOString();
    const due = await (0, scheduler_services_1.getPendingMessagesDue)(now);
    if (due.length === 0) {
        console.log(`[send-messages] ${now} — no pending messages due`);
        return;
    }
    console.log(`[send-messages] ${now} — processing ${due.length} pending message(s)`);
    for (const msg of due) {
        // CLAIM the message before sending — idempotency lock.
        // Any concurrent tick will NOT re-fetch this message (status is now 'בשליחה').
        await (0, scheduler_services_1.markMessageSending)(msg.id);
        console.log(`[send-messages] claimed message ${msg.id} ("${msg.title}")`);
        const campaignId = msg.campaign_id[0];
        if (!campaignId) {
            console.error(`[send-messages] message ${msg.id} has no campaign_id — marking failed`);
            await (0, scheduler_services_1.markMessageFailed)(msg.id);
            continue;
        }
        const enrollments = await (0, scheduler_services_1.getEnrollmentsForCampaign)(campaignId);
        console.log(`[send-messages] campaign ${campaignId} has ${enrollments.length} enrollment(s)`);
        let sendErrorOccurred = false;
        for (const enrollment of enrollments) {
            const contactId = enrollment.contact_id[0];
            if (!contactId) {
                console.warn(`[send-messages] enrollment ${enrollment.id} has no contact_id — skipping`);
                continue;
            }
            const contact = await (0, contacts_1.getContactById)(contactId);
            if (!contact) {
                console.warn(`[send-messages] contact ${contactId} not found — logging failed`);
                await (0, message_log_1.createMessageLogEntry)({
                    scheduled_message_id: msg.id,
                    contact_id: contactId,
                    campaign_id: campaignId,
                    status: 'failed',
                    error_message: `Contact ${contactId} not found in Airtable`,
                });
                sendErrorOccurred = true;
                continue;
            }
            let chatId;
            try {
                chatId = (0, phone_1.normalizePhone)(contact.phone) + '@c.us';
            }
            catch (phoneErr) {
                console.warn(`[send-messages] invalid phone for contact ${contactId} — logging failed`, phoneErr);
                await (0, message_log_1.createMessageLogEntry)({
                    scheduled_message_id: msg.id,
                    contact_id: contactId,
                    campaign_id: campaignId,
                    status: 'failed',
                    error_message: `Invalid phone: ${String(phoneErr)}`,
                });
                sendErrorOccurred = true;
                continue;
            }
            try {
                const result = await (0, green_api_1.sendWhatsAppMessage)(chatId, msg.message_content);
                console.log(`[send-messages] sent to ${chatId} (contact ${contactId}), idMessage: ${result.idMessage}`);
                await (0, message_log_1.createMessageLogEntry)({
                    scheduled_message_id: msg.id,
                    contact_id: contactId,
                    campaign_id: campaignId,
                    status: 'sent',
                    green_api_response: result.idMessage,
                });
            }
            catch (sendErr) {
                console.error(`[send-messages] send failed for contact ${contactId} (${chatId})`, sendErr);
                await (0, message_log_1.createMessageLogEntry)({
                    scheduled_message_id: msg.id,
                    contact_id: contactId,
                    campaign_id: campaignId,
                    status: 'failed',
                    error_message: String(sendErr),
                });
                sendErrorOccurred = true;
            }
            // 500ms delay between sends to avoid rate-limiting GREEN API
            await new Promise((r) => setTimeout(r, 500));
        }
        // Mark message sent after all contacts are processed.
        // If any contact failed, we still mark the message as sent at the top level
        // (individual failures are logged in MessageLog). Only mark failed if the
        // message itself couldn't be processed at all (no campaign, etc.).
        if (sendErrorOccurred && enrollments.length === 0) {
            await (0, scheduler_services_1.markMessageFailed)(msg.id);
        }
        else {
            await (0, scheduler_services_1.markMessageSent)(msg.id);
        }
        console.log(`[send-messages] finished message ${msg.id}`);
    }
    console.log(`[send-messages] tick complete — processed ${due.length} message(s)`);
}
run().catch(console.error);
