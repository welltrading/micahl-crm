/**
 * Unit tests for GREEN API client
 * Tests mock global fetch — no real HTTP calls
 */

import { getGreenApiState, sendWhatsAppMessage } from '../green-api';

describe('getGreenApiState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns "authorized" when fetch responds with { stateInstance: "authorized" }', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stateInstance: 'authorized' }),
    } as Response);

    const result = await getGreenApiState();

    expect(result).toBe('authorized');
  });

  it('returns "unknown" when fetch throws a network error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    const result = await getGreenApiState();

    expect(result).toBe('unknown');
  });
});

describe('sendWhatsAppMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns { idMessage } when fetch responds with 200', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ idMessage: 'abc123' }),
    } as Response);

    const result = await sendWhatsAppMessage('972501234567@c.us', 'Hello!');

    expect(result).toEqual({ idMessage: 'abc123' });
  });

  it('throws with status code in message when fetch responds with non-OK status', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () => 'Unprocessable Entity',
    } as Response);

    await expect(sendWhatsAppMessage('972501234567@c.us', 'Hello!')).rejects.toThrow('422');
  });
});
