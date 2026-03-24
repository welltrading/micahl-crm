"use strict";
/**
 * GREEN API client — plain Node.js, no 'server-only' import.
 * Used by the Bree scheduler worker and server actions.
 */
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsAppMessage = sendWhatsAppMessage;
exports.getGreenApiState = getGreenApiState;
const GREEN_API_URL = (_a = process.env.GREEN_API_URL) !== null && _a !== void 0 ? _a : 'https://api.green-api.com';
const INSTANCE_ID = (_b = process.env.GREEN_API_INSTANCE_ID) !== null && _b !== void 0 ? _b : '';
const TOKEN = (_c = process.env.GREEN_API_TOKEN) !== null && _c !== void 0 ? _c : '';
/**
 * Send a WhatsApp message via GREEN API.
 * @param chatId - Recipient in GREEN API format, e.g. "972501234567@c.us"
 * @param message - Plain text message body
 * @returns GREEN API response object with idMessage
 * @throws Error with status code on non-2xx response
 */
async function sendWhatsAppMessage(chatId, message) {
    const url = `${GREEN_API_URL}/waInstance${INSTANCE_ID}/sendMessage/${TOKEN}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message }),
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`GREEN API error ${response.status}: ${body}`);
    }
    return response.json();
}
/**
 * Get the current state of the GREEN API WhatsApp instance.
 * Returns 'authorized', 'notAuthorized', or 'unknown' on error.
 */
async function getGreenApiState() {
    var _a;
    try {
        const url = `${GREEN_API_URL}/waInstance${INSTANCE_ID}/getStateInstance/${TOKEN}`;
        const response = await fetch(url);
        const data = (await response.json());
        return (_a = data.stateInstance) !== null && _a !== void 0 ? _a : 'unknown';
    }
    catch (_b) {
        return 'unknown';
    }
}
