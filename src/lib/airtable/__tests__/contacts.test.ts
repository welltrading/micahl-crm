/**
 * Unit tests for Airtable contacts service
 * Airtable fields use Hebrew names (as per schema setup in Plan 02)
 */

// Mock airtableBase before importing contacts module
const mockAll = jest.fn();
const mockFind = jest.fn();
const mockSelect = jest.fn(() => ({ all: mockAll }));
const mockTable = jest.fn(() => ({ select: mockSelect, find: mockFind }));

jest.mock('../client', () => ({
  airtableBase: mockTable,
}));

import { getContacts, getContactById } from '../contacts';
import type { Contact } from '../types';

describe('getContacts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty array when Airtable returns no records', async () => {
    mockAll.mockResolvedValueOnce([]);

    const result = await getContacts();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('never throws when Airtable returns empty table', async () => {
    mockAll.mockResolvedValueOnce([]);

    await expect(getContacts()).resolves.not.toThrow();
  });

  it('maps Airtable record fields correctly to Contact interface', async () => {
    const mockRecord = {
      id: 'rec001',
      fields: {
        'שם מלא': 'רחל כהן',
        'טלפון': '972501234567',
        'תאריך הצטרפות': '2026-03-01T00:00:00.000Z',
        'הערות': 'לקוחה חשובה',
        'נוצר בתאריך': '2026-03-01T10:00:00.000Z',
      },
    };
    mockAll.mockResolvedValueOnce([mockRecord]);

    const result = await getContacts();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<Contact>({
      id: 'rec001',
      full_name: 'רחל כהן',
      phone: '972501234567',
      joined_date: '2026-03-01T00:00:00.000Z',
      notes: 'לקוחה חשובה',
      created_at: '2026-03-01T10:00:00.000Z',
    });
  });

  it('handles optional fields missing gracefully', async () => {
    const mockRecord = {
      id: 'rec002',
      fields: {
        'שם מלא': 'מרים לוי',
        'טלפון': '972509876543',
        'נוצר בתאריך': '2026-03-10T00:00:00.000Z',
      },
    };
    mockAll.mockResolvedValueOnce([mockRecord]);

    const result = await getContacts();

    expect(result[0].joined_date).toBeUndefined();
    expect(result[0].notes).toBeUndefined();
  });
});

describe('getContactById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when record not found', async () => {
    mockFind.mockRejectedValueOnce(new Error('Record not found'));

    const result = await getContactById('nonexistent-id');

    expect(result).toBeNull();
  });

  it('returns Contact when record exists', async () => {
    const mockRecord = {
      id: 'rec003',
      fields: {
        'שם מלא': 'דינה אברהם',
        'טלפון': '972541234567',
        'נוצר בתאריך': '2026-03-15T00:00:00.000Z',
      },
    };
    mockFind.mockResolvedValueOnce(mockRecord);

    const result = await getContactById('rec003');

    expect(result).not.toBeNull();
    expect(result?.id).toBe('rec003');
    expect(result?.full_name).toBe('דינה אברהם');
  });

  it('calls Airtable find with the correct record id', async () => {
    mockFind.mockResolvedValueOnce({
      id: 'recXYZ',
      fields: { 'שם מלא': 'test', 'טלפון': '972500000000', 'נוצר בתאריך': '2026-01-01T00:00:00.000Z' },
    });

    await getContactById('recXYZ');

    expect(mockFind).toHaveBeenCalledWith('recXYZ');
  });
});
