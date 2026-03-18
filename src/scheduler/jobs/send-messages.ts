// Bree worker thread — runs in its own Node.js thread, no Next.js context.
// NO 'use server', NO 'server-only', NO Next.js imports.
// Relative imports only — @/ aliases are not resolved at runtime in worker threads.

import {
  getPendingMessagesDue,
  markMessageSending,
  markMessageSent,
  markMessageFailed,
  getEnrollmentsForCampaign,
} from '../../lib/airtable/scheduler-services';
import { getContactById } from '../../lib/airtable/contacts';
import { sendWhatsAppMessage } from '../../lib/airtable/green-api';
import { createMessageLogEntry } from '../../lib/airtable/message-log';
import { normalizePhone } from '../../lib/airtable/phone';

async function run(): Promise<void> {
  const now = new Date().toISOString();
  const due = await getPendingMessagesDue(now);

  if (due.length === 0) {
    console.log(`[send-messages] ${now} — no pending messages due`);
    return;
  }

  console.log(`[send-messages] ${now} — processing ${due.length} pending message(s)`);

  for (const msg of due) {
    // CLAIM the message before sending — idempotency lock.
    // Any concurrent tick will NOT re-fetch this message (status is now 'בשליחה').
    await markMessageSending(msg.id);
    console.log(`[send-messages] claimed message ${msg.id} ("${msg.title}")`);

    const campaignId = msg.campaign_id[0];
    if (!campaignId) {
      console.error(`[send-messages] message ${msg.id} has no campaign_id — marking failed`);
      await markMessageFailed(msg.id);
      continue;
    }

    const enrollments = await getEnrollmentsForCampaign(campaignId);
    console.log(`[send-messages] campaign ${campaignId} has ${enrollments.length} enrollment(s)`);

    let sendErrorOccurred = false;

    for (const enrollment of enrollments) {
      const contactId = enrollment.contact_id[0];
      if (!contactId) {
        console.warn(`[send-messages] enrollment ${enrollment.id} has no contact_id — skipping`);
        continue;
      }

      const contact = await getContactById(contactId);
      if (!contact) {
        console.warn(`[send-messages] contact ${contactId} not found — logging failed`);
        await createMessageLogEntry({
          scheduled_message_id: msg.id,
          contact_id: contactId,
          campaign_id: campaignId,
          status: 'failed',
          error_message: `Contact ${contactId} not found in Airtable`,
        });
        sendErrorOccurred = true;
        continue;
      }

      let chatId: string;
      try {
        chatId = normalizePhone(contact.phone) + '@c.us';
      } catch (phoneErr) {
        console.warn(
          `[send-messages] invalid phone for contact ${contactId} — logging failed`,
          phoneErr
        );
        await createMessageLogEntry({
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
        const result = await sendWhatsAppMessage(chatId, msg.message_content);
        console.log(
          `[send-messages] sent to ${chatId} (contact ${contactId}), idMessage: ${result.idMessage}`
        );
        await createMessageLogEntry({
          scheduled_message_id: msg.id,
          contact_id: contactId,
          campaign_id: campaignId,
          status: 'sent',
          green_api_response: result.idMessage,
        });
      } catch (sendErr) {
        console.error(
          `[send-messages] send failed for contact ${contactId} (${chatId})`,
          sendErr
        );
        await createMessageLogEntry({
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
      await markMessageFailed(msg.id);
    } else {
      await markMessageSent(msg.id);
    }
    console.log(`[send-messages] finished message ${msg.id}`);
  }

  console.log(`[send-messages] tick complete — processed ${due.length} message(s)`);
}

run().catch(console.error);
