/**
 * Unit tests for Airtable campaigns service
 * Airtable fields use Hebrew names (as per schema setup in Plan 02)
 */

// Mock airtableBase before importing campaigns module
const mockAll = jest.fn();
const mockFind = jest.fn();
const mockSelect = jest.fn(() => ({ all: mockAll }));
const mockTable = jest.fn(() => ({ select: mockSelect, find: mockFind }));

jest.mock('../client', () => ({
  airtableBase: mockTable,
}));

import { getCampaigns, getCampaignById } from '../campaigns';
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
