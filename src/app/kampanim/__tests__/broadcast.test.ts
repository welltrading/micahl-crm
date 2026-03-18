/**
 * Unit tests for broadcastAction — send WhatsApp messages to all campaign enrollments.
 * broadcastAction is implemented in plan 04-03; these tests are RED stubs until then.
 */

// Mock airtable client to prevent env-var check at module init time
jest.mock('@/lib/airtable/client', () => ({
  airtableBase: jest.fn(() => ({
    select: jest.fn(() => ({ all: jest.fn().mockResolvedValue([]) })),
    create: jest.fn(),
    update: jest.fn(),
  })),
}));

// Mock the scheduler services and green-api
jest.mock('@/lib/airtable/scheduler-services', () => ({
  getEnrollmentsForCampaign: jest.fn(),
}));

jest.mock('@/lib/airtable/contacts', () => ({
  getContactById: jest.fn(),
}));

jest.mock('@/lib/airtable/green-api', () => ({
  sendWhatsAppMessage: jest.fn(),
}));

import { broadcastAction } from '../actions';
import { getEnrollmentsForCampaign } from '@/lib/airtable/scheduler-services';
import { getContactById } from '@/lib/airtable/contacts';
import { sendWhatsAppMessage } from '@/lib/airtable/green-api';

const mockGetEnrollments = getEnrollmentsForCampaign as jest.MockedFunction<typeof getEnrollmentsForCampaign>;
const mockGetContactById = getContactById as jest.MockedFunction<typeof getContactById>;
const mockSendMessage = sendWhatsAppMessage as jest.MockedFunction<typeof sendWhatsAppMessage>;

const MOCK_ENROLLMENT_1 = {
  id: 'recEnroll1',
  campaign_id: ['recCamp1'],
  contact_id: ['recContact1'],
  source: 'manual' as const,
};
const MOCK_ENROLLMENT_2 = {
  id: 'recEnroll2',
  campaign_id: ['recCamp1'],
  contact_id: ['recContact2'],
  source: 'manual' as const,
};

const MOCK_CONTACT_1 = {
  id: 'recContact1',
  full_name: 'רחל כהן',
  phone: '972501234567',
  created_at: '2026-03-01T00:00:00.000Z',
};

const MOCK_CONTACT_2 = {
  id: 'recContact2',
  full_name: 'מרים לוי',
  phone: '972509876543',
  created_at: '2026-03-01T00:00:00.000Z',
};

describe('broadcastAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls sendWhatsAppMessage once per enrolled contact', async () => {
    mockGetEnrollments.mockResolvedValueOnce([MOCK_ENROLLMENT_1, MOCK_ENROLLMENT_2]);
    mockGetContactById
      .mockResolvedValueOnce(MOCK_CONTACT_1)
      .mockResolvedValueOnce(MOCK_CONTACT_2);
    mockSendMessage.mockResolvedValue({ idMessage: 'msg-abc' });

    await broadcastAction('recCamp1', 'שלום! תזכורת לאירוע');

    expect(mockSendMessage).toHaveBeenCalledTimes(2);
    expect(mockSendMessage).toHaveBeenCalledWith('972501234567@c.us', 'שלום! תזכורת לאירוע');
    expect(mockSendMessage).toHaveBeenCalledWith('972509876543@c.us', 'שלום! תזכורת לאירוע');
  });

  it('returns { ok: true, sent: 2, failed: 0 } when all contacts succeed', async () => {
    mockGetEnrollments.mockResolvedValueOnce([MOCK_ENROLLMENT_1, MOCK_ENROLLMENT_2]);
    mockGetContactById
      .mockResolvedValueOnce(MOCK_CONTACT_1)
      .mockResolvedValueOnce(MOCK_CONTACT_2);
    mockSendMessage.mockResolvedValue({ idMessage: 'msg-ok' });

    const result = await broadcastAction('recCamp1', 'הודעה');

    expect(result).toEqual({ ok: true, sent: 2, failed: 0 });
  });

  it('returns { ok: true, sent: 1, failed: 1 } when one contact throws', async () => {
    mockGetEnrollments.mockResolvedValueOnce([MOCK_ENROLLMENT_1, MOCK_ENROLLMENT_2]);
    mockGetContactById
      .mockResolvedValueOnce(MOCK_CONTACT_1)
      .mockResolvedValueOnce(MOCK_CONTACT_2);
    mockSendMessage
      .mockResolvedValueOnce({ idMessage: 'msg-ok' })
      .mockRejectedValueOnce(new Error('GREEN API error 422: bad request'));

    const result = await broadcastAction('recCamp1', 'הודעה');

    expect(result).toEqual({ ok: true, sent: 1, failed: 1 });
  });
});
