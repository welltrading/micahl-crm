/**
 * Unit tests for POST /api/webhook/contact
 *
 * Tests:
 *  1. Missing x-webhook-secret header → 401
 *  2. Wrong secret value → 401
 *  3. Valid secret, missing name fields → 400
 *  4. Valid secret, missing phone → 400
 *  5. Valid secret + first_name/last_name body → calls airtableBase create, returns 201
 *  6. Legacy full_name body → splits and creates contact (backwards compat)
 *  7. Phone '050-123-4567' stored as '972501234567' (normalizePhone called)
 */

// Mock airtableBase before importing route module
const mockCreate = jest.fn();
const mockTable = jest.fn(() => ({ create: mockCreate }));

jest.mock('../../../../../lib/airtable/client', () => ({
  airtableBase: mockTable,
}));

// Mock normalizePhone — spy on actual implementation via module mock
jest.mock('../../../../../lib/airtable/phone', () => ({
  normalizePhone: jest.fn((phone: string) => {
    // Minimal implementation for test isolation
    const stripped = phone.replace(/[^\d+]/g, '');
    if (/^972\d{9}$/.test(stripped)) return stripped;
    if (/^\+972\d{9}$/.test(stripped)) return stripped.slice(1);
    if (/^0\d{9}$/.test(stripped)) return '972' + stripped.slice(1);
    throw new Error(`Cannot normalize phone number: "${phone}"`);
  }),
}));

import { POST } from '../route';
import { normalizePhone } from '../../../../../lib/airtable/phone';

// Helper to build a mock NextRequest
function makeRequest(
  headers: Record<string, string>,
  body: unknown
): Request {
  return new Request('http://localhost/api/webhook/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const TEST_SECRET = 'test-webhook-secret-abc123';

describe('POST /api/webhook/contact', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WEBHOOK_SECRET = TEST_SECRET;
    mockCreate.mockResolvedValue({ id: 'recNew', fields: {} });
  });

  afterEach(() => {
    delete process.env.WEBHOOK_SECRET;
  });

  it('returns 401 when x-webhook-secret header is missing', async () => {
    const req = makeRequest({}, { first_name: 'שרה', last_name: 'לוי', phone: '050-123-4567' });
    const res = await POST(req as any);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when x-webhook-secret header has wrong value', async () => {
    const req = makeRequest(
      { 'x-webhook-secret': 'wrong-secret' },
      { first_name: 'שרה', last_name: 'לוי', phone: '050-123-4567' }
    );
    const res = await POST(req as any);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: 'Unauthorized' });
  });

  it('returns 400 when name fields are missing', async () => {
    const req = makeRequest(
      { 'x-webhook-secret': TEST_SECRET },
      { phone: '050-123-4567' }
    );
    const res = await POST(req as any);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: 'Missing required fields' });
  });

  it('returns 400 when phone is missing', async () => {
    const req = makeRequest(
      { 'x-webhook-secret': TEST_SECRET },
      { first_name: 'שרה', last_name: 'לוי' }
    );
    const res = await POST(req as any);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: 'Missing required fields' });
  });

  it('creates contact with first_name + last_name and returns 201', async () => {
    const req = makeRequest(
      { 'x-webhook-secret': TEST_SECRET },
      { first_name: 'שרה', last_name: 'לוי', phone: '050-123-4567' }
    );
    const res = await POST(req as any);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({ success: true });

    expect(mockTable).toHaveBeenCalledWith('מתענינות');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        'שם פרטי': 'שרה',
        'שם משפחה': 'לוי',
        'טלפון': '972501234567',
      })
    );
  });

  it('supports legacy full_name payload by splitting on first space', async () => {
    const req = makeRequest(
      { 'x-webhook-secret': TEST_SECRET },
      { full_name: 'דינה אברהם כהן', phone: '050-123-4567' }
    );
    const res = await POST(req as any);

    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        'שם פרטי': 'דינה',
        'שם משפחה': 'אברהם כהן',
      })
    );
  });

  it('normalizes phone 050-123-4567 to 972501234567 before storing', async () => {
    const req = makeRequest(
      { 'x-webhook-secret': TEST_SECRET },
      { first_name: 'דינה', last_name: 'כהן', phone: '050-123-4567' }
    );
    await POST(req as any);

    expect(normalizePhone).toHaveBeenCalledWith('050-123-4567');
    const createArg = mockCreate.mock.calls[0][0];
    expect(createArg['טלפון']).toBe('972501234567');
  });
});
