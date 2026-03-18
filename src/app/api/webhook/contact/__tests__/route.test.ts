/**
 * Unit tests for POST /api/webhook/contact
 *
 * Tests:
 *  1. Missing x-webhook-secret header → 401
 *  2. Wrong secret value → 401
 *  3. Valid secret, missing full_name → 400
 *  4. Valid secret, missing phone → 400
 *  5. Valid secret + valid body → calls airtableBase create, returns 201
 *  6. Phone '050-123-4567' stored as '972501234567' (normalizePhone called)
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
    const req = makeRequest({}, { full_name: 'שרה לוי', phone: '050-123-4567' });
    const res = await POST(req as any);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when x-webhook-secret header has wrong value', async () => {
    const req = makeRequest(
      { 'x-webhook-secret': 'wrong-secret' },
      { full_name: 'שרה לוי', phone: '050-123-4567' }
    );
    const res = await POST(req as any);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: 'Unauthorized' });
  });

  it('returns 400 when full_name is missing', async () => {
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
      { full_name: 'שרה לוי' }
    );
    const res = await POST(req as any);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: 'Missing required fields' });
  });

  it('calls airtableBase(Contacts).create with normalized phone and returns 201', async () => {
    const req = makeRequest(
      { 'x-webhook-secret': TEST_SECRET },
      { full_name: 'שרה לוי', phone: '050-123-4567' }
    );
    const res = await POST(req as any);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({ success: true });

    expect(mockTable).toHaveBeenCalledWith('Contacts');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        'שם מלא': 'שרה לוי',
        'טלפון': '972501234567',
      })
    );
  });

  it('normalizes phone 050-123-4567 to 972501234567 before storing', async () => {
    const req = makeRequest(
      { 'x-webhook-secret': TEST_SECRET },
      { full_name: 'דינה כהן', phone: '050-123-4567' }
    );
    await POST(req as any);

    expect(normalizePhone).toHaveBeenCalledWith('050-123-4567');
    const createArg = mockCreate.mock.calls[0][0];
    expect(createArg['טלפון']).toBe('972501234567');
  });
});
