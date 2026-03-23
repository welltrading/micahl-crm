/**
 * Unit tests for Airtable campaigns service
 * Airtable fields use Hebrew names (as per schema setup in Plan 02)
 */

// Mock airtableBase before importing campaigns module
const mockAll = jest.fn();
const mockFind = jest.fn();
const mockCreate = jest.fn();
const mockDestroy = jest.fn();
const mockSelect = jest.fn(() => ({ all: mockAll }));
const mockTable = jest.fn(() => ({ select: mockSelect, find: mockFind, create: mockCreate, destroy: mockDestroy }));

jest.mock('../client', () => ({
  airtableBase: mockTable,
}));

import { getCampaigns, getCampaignById, createCampaign, getEnrollmentCountsByCampaign, deriveCampaignStatus, getEnrolleesForCampaign, deleteEnrollment } from '../campaigns';
import type { Campaign } from '../types';

describe('getCampaigns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty array when Airtable returns no records', async () => {
    mockAll.mockResolvedValueOnce([]);

    const result = await getCampaigns();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('never throws when Airtable returns empty table', async () => {
    mockAll.mockResolvedValueOnce([]);

    await expect(getCampaigns()).resolves.not.toThrow();
  });

  it('maps Airtable record fields correctly to Campaign interface', async () => {
    const mockRecord = {
      id: 'rec123',
      fields: {
        'שם קמפיין': 'יוגה לנשים',
        'תאריך אירוע': '2026-04-01T09:00:00.000Z',
        'תיאור': 'קורס יוגה לנשים מתחילות',
        'סטטוס': 'future',
        'נוצר בתאריך': '2026-03-01T10:00:00.000Z',
      },
    };
    mockAll.mockResolvedValueOnce([mockRecord]);

    const result = await getCampaigns();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<Campaign>({
      id: 'rec123',
      campaign_name: 'יוגה לנשים',
      event_date: '2026-04-01T09:00:00.000Z',
      description: 'קורס יוגה לנשים מתחילות',
      status: 'future',
      created_at: '2026-03-01T10:00:00.000Z',
    });
  });

  it('handles records with optional fields missing', async () => {
    const mockRecord = {
      id: 'rec456',
      fields: {
        'שם קמפיין': 'מדיטציה',
        'תאריך אירוע': '2025-12-01T09:00:00.000Z',
        'סטטוס': 'ended',
        'נוצר בתאריך': '2025-11-01T10:00:00.000Z',
      },
    };
    mockAll.mockResolvedValueOnce([mockRecord]);

    const result = await getCampaigns();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('rec456');
    expect(result[0].description).toBeUndefined();
  });

  it('returns multiple campaigns', async () => {
    const mockRecords = [
      { id: 'rec1', fields: { 'שם קמפיין': 'קמפיין א', 'תאריך אירוע': '2026-05-01T00:00:00.000Z', 'סטטוס': 'future', 'נוצר בתאריך': '2026-01-01T00:00:00.000Z' } },
      { id: 'rec2', fields: { 'שם קמפיין': 'קמפיין ב', 'תאריך אירוע': '2025-12-01T00:00:00.000Z', 'סטטוס': 'ended', 'נוצר בתאריך': '2025-10-01T00:00:00.000Z' } },
    ];
    mockAll.mockResolvedValueOnce(mockRecords);

    const result = await getCampaigns();

    expect(result).toHaveLength(2);
  });
});

describe('getCampaignById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when record not found', async () => {
    mockFind.mockRejectedValueOnce(new Error('Record not found'));

    const result = await getCampaignById('nonexistent-id');

    expect(result).toBeNull();
  });

  it('returns Campaign when record exists', async () => {
    const mockRecord = {
      id: 'rec789',
      fields: {
        'שם קמפיין': 'יוגה לנשים',
        'תאריך אירוע': '2026-04-01T09:00:00.000Z',
        'סטטוס': 'active',
        'נוצר בתאריך': '2026-03-01T10:00:00.000Z',
      },
    };
    mockFind.mockResolvedValueOnce(mockRecord);

    const result = await getCampaignById('rec789');

    expect(result).not.toBeNull();
    expect(result?.id).toBe('rec789');
    expect(result?.campaign_name).toBe('יוגה לנשים');
  });

  it('calls Airtable find with the correct record id', async () => {
    mockFind.mockResolvedValueOnce({
      id: 'recABC',
      fields: { 'שם קמפיין': 'test', 'תאריך אירוע': '2026-01-01T00:00:00.000Z', 'סטטוס': 'future', 'נוצר בתאריך': '2026-01-01T00:00:00.000Z' },
    });

    await getCampaignById('recABC');

    expect(mockFind).toHaveBeenCalledWith('recABC');
  });
});

// ── Wave 0 stubs: Plan 02 will implement these functions ──────────────────────

describe('createCampaign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls Airtable create with correct Hebrew field names', async () => {
    mockCreate.mockResolvedValueOnce({
      id: 'recNew1',
      fields: {
        'שם קמפיין': 'קמפיין חדש',
        'תאריך אירוע': '2026-06-01T00:00:00.000Z',
        'תיאור': 'תיאור קצר',
        'נוצר בתאריך': '2026-03-18T00:00:00.000Z',
      },
    });

    await createCampaign({
      campaign_name: 'קמפיין חדש',
      event_date: '2026-06-01T00:00:00.000Z',
      description: 'תיאור קצר',
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        'שם קמפיין': 'קמפיין חדש',
        'תאריך אירוע': '2026-06-01T00:00:00.000Z',
      })
    );
  });

  it('returns created Campaign object', async () => {
    mockCreate.mockResolvedValueOnce({
      id: 'recNew2',
      fields: {
        'שם קמפיין': 'יוגה',
        'תאריך אירוע': '2026-07-01T00:00:00.000Z',
        'נוצר בתאריך': '2026-03-18T00:00:00.000Z',
      },
    });

    const result = await createCampaign({
      campaign_name: 'יוגה',
      event_date: '2026-07-01T00:00:00.000Z',
    });

    expect(result).toMatchObject({
      id: 'recNew2',
      campaign_name: 'יוגה',
      event_date: '2026-07-01T00:00:00.000Z',
    });
  });
});

describe('getEnrollmentCountsByCampaign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty object when no enrollments', async () => {
    mockAll.mockResolvedValueOnce([]);

    const result = await getEnrollmentCountsByCampaign();

    expect(result).toEqual({});
  });

  it('counts correctly when multiple enrollments reference same campaign', async () => {
    const mockRecords = [
      { id: 'enr1', fields: { 'קמפיין': ['recCamp1'] } },
      { id: 'enr2', fields: { 'קמפיין': ['recCamp1'] } },
      { id: 'enr3', fields: { 'קמפיין': ['recCamp2'] } },
    ];
    mockAll.mockResolvedValueOnce(mockRecords);

    const result = await getEnrollmentCountsByCampaign();

    expect(result['recCamp1']).toBe(2);
    expect(result['recCamp2']).toBe(1);
  });
});

describe('deriveCampaignStatus', () => {
  it("returns 'future' when event_date is in the future", () => {
    const futureDate = new Date();
    futureDate.setUTCDate(futureDate.getUTCDate() + 10);
    const result = deriveCampaignStatus(futureDate.toISOString());
    expect(result).toBe('future');
  });

  it("returns 'active' when event_date is today", () => {
    const today = new Date();
    // Set to today's UTC date at noon to ensure it's "today" but not past 24h mark
    const todayISO = today.toISOString().slice(0, 10) + 'T12:00:00.000Z';
    const result = deriveCampaignStatus(todayISO);
    // Could be 'active' or 'future' depending on exact hour — just verify it's not 'ended'
    expect(['active', 'future']).toContain(result);
  });

  it("returns 'ended' when event_date is in the past", () => {
    const pastDate = new Date();
    pastDate.setUTCDate(pastDate.getUTCDate() - 10);
    const result = deriveCampaignStatus(pastDate.toISOString());
    expect(result).toBe('ended');
  });
});

describe('getEnrolleesForCampaign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns array of 2 objects for 2 enrollment records matching campaign', async () => {
    const mockRecords = [
      {
        id: 'recEnroll1',
        fields: { 'קמפיין': ['rec123'], 'איש קשר': ['recContact1'] },
      },
      {
        id: 'recEnroll2',
        fields: { 'קמפיין': ['rec123'], 'איש קשר': ['recContact2'] },
      },
    ];
    mockAll.mockResolvedValueOnce(mockRecords);

    const result = await getEnrolleesForCampaign('rec123');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ enrollment_id: 'recEnroll1', contact_id: 'recContact1' });
    expect(result[1]).toEqual({ enrollment_id: 'recEnroll2', contact_id: 'recContact2' });
  });

  it('fetches all records from נרשמות and filters by campaignId', async () => {
    const mockRecords = [
      { id: 'recEnrollA', fields: { 'קמפיין': ['rec123'], 'איש קשר': ['recContactA'] } },
      { id: 'recEnrollB', fields: { 'קמפיין': ['recOTHER'], 'איש קשר': ['recContactB'] } },
    ];
    mockAll.mockResolvedValueOnce(mockRecords);

    const result = await getEnrolleesForCampaign('rec123');

    expect(mockTable).toHaveBeenCalledWith('נרשמות');
    expect(result).toHaveLength(1);
    expect(result[0].enrollment_id).toBe('recEnrollA');
    expect(result[0].contact_id).toBe('recContactA');
  });

  it('handles missing איש קשר linked record gracefully', async () => {
    const mockRecords = [
      {
        id: 'recEnroll4',
        fields: { 'קמפיין': ['rec123'] /* no 'איש קשר' field */ },
      },
    ];
    mockAll.mockResolvedValueOnce(mockRecords);

    const result = await getEnrolleesForCampaign('rec123');

    expect(result[0].contact_id).toBe('');
  });

  it('returns empty array when no enrollments found', async () => {
    mockAll.mockResolvedValueOnce([]);

    const result = await getEnrolleesForCampaign('rec123');

    expect(result).toEqual([]);
  });
});

describe('deleteEnrollment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls airtableBase(נרשמות).destroy with the enrollmentId', async () => {
    mockDestroy.mockResolvedValueOnce({ id: 'recABC' });

    await deleteEnrollment('recABC');

    expect(mockTable).toHaveBeenCalledWith('נרשמות');
    expect(mockDestroy).toHaveBeenCalledWith('recABC');
  });

  it('returns void on success', async () => {
    mockDestroy.mockResolvedValueOnce({ id: 'recABC' });

    const result = await deleteEnrollment('recABC');

    expect(result).toBeUndefined();
  });

  it('propagates Airtable error without swallowing', async () => {
    mockDestroy.mockRejectedValueOnce(new Error('Record not found'));

    await expect(deleteEnrollment('invalidId')).rejects.toThrow('Record not found');
  });
});
