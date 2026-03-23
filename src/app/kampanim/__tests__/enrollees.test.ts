/**
 * Unit tests for getEnrolleesAction and removeEnrollmentAction
 * Uses jest.spyOn (not jest.mock) per Phase 05 decision to avoid hoisting conflict with client mock.
 */

// Mock airtable client to prevent env-var check at module init time
jest.mock('@/lib/airtable/client', () => ({
  airtableBase: jest.fn(() => ({
    select: jest.fn(() => ({ all: jest.fn().mockResolvedValue([]) })),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  })),
}));

// Mock the campaigns and contacts service modules
jest.mock('@/lib/airtable/campaigns', () => ({
  getEnrolleesForCampaign: jest.fn(),
  deleteEnrollment: jest.fn(),
  // also stub other exports to prevent import errors
  getCampaigns: jest.fn(),
  getCampaignById: jest.fn(),
  createCampaign: jest.fn(),
  deleteCampaign: jest.fn(),
  updateCampaignWelcomeMessage: jest.fn(),
  getEnrollmentCountsByCampaign: jest.fn(),
  deriveCampaignStatus: jest.fn(),
}));

jest.mock('@/lib/airtable/contacts', () => ({
  getContactById: jest.fn(),
  getContacts: jest.fn(),
  getEnrolledContactIds: jest.fn(),
  createContact: jest.fn(),
  getContactEnrollments: jest.fn(),
  getContactMessages: jest.fn(),
}));

jest.mock('@/lib/airtable/scheduler-services', () => ({
  getEnrollmentsForCampaign: jest.fn(),
}));

jest.mock('@/lib/airtable/green-api', () => ({
  sendWhatsAppMessage: jest.fn(),
}));

jest.mock('@/lib/airtable/scheduled-messages', () => ({
  getScheduledMessagesByCampaign: jest.fn(),
  createScheduledMessage: jest.fn(),
  updateScheduledMessage: jest.fn(),
}));

jest.mock('@/lib/airtable/message-log', () => ({
  getMessageLogByCampaign: jest.fn(),
}));

import { getEnrolleesAction, removeEnrollmentAction } from '../actions';
import * as campaignsModule from '@/lib/airtable/campaigns';
import * as contactsModule from '@/lib/airtable/contacts';

const mockGetEnrolleesForCampaign = campaignsModule.getEnrolleesForCampaign as jest.MockedFunction<typeof campaignsModule.getEnrolleesForCampaign>;
const mockDeleteEnrollment = campaignsModule.deleteEnrollment as jest.MockedFunction<typeof campaignsModule.deleteEnrollment>;
const mockGetContactById = contactsModule.getContactById as jest.MockedFunction<typeof contactsModule.getContactById>;

const MOCK_ENROLLMENT_RAW = {
  enrollment_id: 'recEnroll1',
  contact_id: 'recContact1',
};

const MOCK_CONTACT = {
  id: 'recContact1',
  first_name: 'רחל',
  last_name: 'כהן',
  full_name: 'רחל כהן',
  phone: '972501234567',
  email: 'rachel@example.com',
  created_at: '2026-03-01T00:00:00.000Z',
};

describe('getEnrolleesAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns { enrollees } array on success', async () => {
    mockGetEnrolleesForCampaign.mockResolvedValueOnce([MOCK_ENROLLMENT_RAW]);
    mockGetContactById.mockResolvedValueOnce(MOCK_CONTACT);

    const result = await getEnrolleesAction('recCamp1');

    expect(result).toEqual({
      enrollees: [
        {
          enrollment_id: 'recEnroll1',
          full_name: 'רחל כהן',
          phone: '972501234567',
          email: 'rachel@example.com',
        },
      ],
    });
  });

  it('calls getEnrolleesForCampaign then getContactById in parallel for each enrollment', async () => {
    const enrollment2 = { enrollment_id: 'recEnroll2', contact_id: 'recContact2' };
    mockGetEnrolleesForCampaign.mockResolvedValueOnce([MOCK_ENROLLMENT_RAW, enrollment2]);
    mockGetContactById
      .mockResolvedValueOnce(MOCK_CONTACT)
      .mockResolvedValueOnce({ ...MOCK_CONTACT, id: 'recContact2', full_name: 'מרים לוי', phone: '972509876543' });

    const result = await getEnrolleesAction('recCamp1');

    expect(mockGetContactById).toHaveBeenCalledTimes(2);
    expect(mockGetContactById).toHaveBeenCalledWith('recContact1');
    expect(mockGetContactById).toHaveBeenCalledWith('recContact2');
    expect('enrollees' in result && result.enrollees).toHaveLength(2);
  });

  it('returns { error: "campaignId is required" } when campaignId is empty string', async () => {
    const result = await getEnrolleesAction('');

    expect(result).toEqual({ error: 'campaignId is required' });
    expect(mockGetEnrolleesForCampaign).not.toHaveBeenCalled();
  });

  it('returns { error } when service throws', async () => {
    mockGetEnrolleesForCampaign.mockRejectedValueOnce(new Error('Airtable error'));

    const result = await getEnrolleesAction('recCamp1');

    expect('error' in result).toBe(true);
  });

  it('filters out enrollments where getContactById returns null', async () => {
    const enrollment2 = { enrollment_id: 'recEnroll2', contact_id: 'recContact2' };
    mockGetEnrolleesForCampaign.mockResolvedValueOnce([MOCK_ENROLLMENT_RAW, enrollment2]);
    mockGetContactById
      .mockResolvedValueOnce(MOCK_CONTACT)
      .mockResolvedValueOnce(null);

    const result = await getEnrolleesAction('recCamp1');

    expect('enrollees' in result && result.enrollees).toHaveLength(1);
    expect('enrollees' in result && result.enrollees[0].enrollment_id).toBe('recEnroll1');
  });
});

describe('removeEnrollmentAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls deleteEnrollment and returns { ok: true } on success', async () => {
    mockDeleteEnrollment.mockResolvedValueOnce(undefined);

    const result = await removeEnrollmentAction('recABC');

    expect(mockDeleteEnrollment).toHaveBeenCalledWith('recABC');
    expect(result).toEqual({ ok: true });
  });

  it('returns { error: "enrollmentId is required" } when enrollmentId is empty string', async () => {
    const result = await removeEnrollmentAction('');

    expect(result).toEqual({ error: 'enrollmentId is required' });
    expect(mockDeleteEnrollment).not.toHaveBeenCalled();
  });

  it('returns { error: "שגיאה בביטול הרישום. נסי שנית." } when deleteEnrollment throws', async () => {
    mockDeleteEnrollment.mockRejectedValueOnce(new Error('Airtable error'));

    const result = await removeEnrollmentAction('recABC');

    expect(result).toEqual({ error: 'שגיאה בביטול הרישום. נסי שנית.' });
  });
});
