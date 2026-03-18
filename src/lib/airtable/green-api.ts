/**
 * GREEN API client — plain Node.js, no 'server-only' import.
 * Used by the Bree scheduler worker and server actions.
 */

const GREEN_API_URL = process.env.GREEN_API_URL ?? 'https://api.green-api.com';
const INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID ?? '';
const TOKEN = process.env.GREEN_API_TOKEN ?? '';

/**
 * Send a WhatsApp message via GREEN API.
 * @param chatId - Recipient in GREEN API format, e.g. "972501234567@c.us"
 * @param message - Plain text message body
 * @returns GREEN API response object with idMessage
 * @throws Error with status code on non-2xx response
 */
export async function sendWhatsAppMessage(
  chatId: string,
  message: string
): Promise<{ idMessage: string }> {
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

  return response.json() as Promise<{ idMessage: string }>;
}

/**
 * Get the current state of the GREEN API WhatsApp instance.
 * Returns 'authorized', 'notAuthorized', or 'unknown' on error.
 */
export async function getGreenApiState(): Promise<string> {
  try {
    const url = `${GREEN_API_URL}/waInstance${INSTANCE_ID}/getStateInstance/${TOKEN}`;
    const response = await fetch(url);
    const data = (await response.json()) as { stateInstance?: string };
    return data.stateInstance ?? 'unknown';
  } catch {
    return 'unknown';
  }
}
