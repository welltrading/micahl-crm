/**
 * Unit tests for Airtable contacts service
 * Airtable fields use Hebrew names (as per schema setup in Plan 02)
 */

// Mock airtableBase before importing contacts module
const mockAll = jest.fn();
const mockFind = jest.fn();
const mockCreate = jest.fn();
const mockSelect = jest.fn(() => ({ all: mockAll }));
const mockTable = jest.fn(() => ({ select: mockSelect, find: mockFind, create: mockCreate }));

jest.mock('../client', () => ({
  airtableBase: mockTable,
}));

// Mock next/cache for revalidatePath
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

import { getContacts, getContactById, createContact, getContactEnrollments, getContactMessages } from '../contacts';
import type { Contact, CampaignEnrollment, ScheduledMessage } from '../types';

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

describe('createContact', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls Airtable create with normalized phone', async () => {
    mockCreate.mockResolvedValueOnce({ id: 'recNew', fields: {} });

    await createContact({ full_name: 'שרה לוי', phone: '050-123-4567' });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        'שם מלא': 'שרה לוי',
        'טלפון': '972501234567',
      }),
      expect.anything()
    );
  });

  it('normalizes +972 format before storing', async () => {
    mockCreate.mockResolvedValueOnce({ id: 'recNew2', fields: {} });

    await createContact({ full_name: 'מרים כהן', phone: '+972521234567' });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        'טלפון': '972521234567',
      }),
      expect.anything()
    );
  });

  it('includes תאריך הצטרפות as today ISO date', async () => {
    mockCreate.mockResolvedValueOnce({ id: 'recNew3', fields: {} });

    const today = new Date().toISOString().split('T')[0];
    await createContact({ full_name: 'לאה דוד', phone: '0501234567' });

    const callArg = mockCreate.mock.calls[0][0];
    expect(callArg['תאריך הצטרפות']).toBe(today);
  });

  it('returns { success: true } on successful creation', async () => {
    mockCreate.mockResolvedValueOnce({ id: 'recNew4', fields: {} });

    const result = await createContact({ full_name: 'רות אלון', phone: '972501234567' });

    expect(result).toEqual({ success: true });
  });
});

describe('getContactEnrollments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses FIND ARRAYJOIN filterByFormula for linked record field', async () => {
    mockAll.mockResolvedValueOnce([]);

    await getContactEnrollments('recABC');

    expect(mockSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        filterByFormula: 'FIND("recABC", ARRAYJOIN({איש קשר}))',
      })
    );
  });

  it('queries the CampaignEnrollments table', async () => {
    mockAll.mockResolvedValueOnce([]);

    await getContactEnrollments('recABC');

    expect(mockTable).toHaveBeenCalledWith('CampaignEnrollments');
  });

  it('returns only enrollments matching the contact', async () => {
    const mockRecords = [
      {
        id: 'recEnroll1',
        fields: {
          'קמפיין': ['recCamp1'],
          'איש קשר': ['recABC'],
          'מקור': 'ידני',
          'תאריך רישום': '2026-03-01T00:00:00.000Z',
        },
      },
    ];
    mockAll.mockResolvedValueOnce(mockRecords);

    const result = await getContactEnrollments('recABC');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<CampaignEnrollment>({
      id: 'recEnroll1',
      campaign_id: ['recCamp1'],
      contact_id: ['recABC'],
      source: 'manual',
      enrolled_at: '2026-03-01T00:00:00.000Z',
    });
  });

  it('maps מקור Webhook to webhook source', async () => {
    const mockRecords = [
      {
        id: 'recEnroll2',
        fields: {
          'קמפיין': ['recCamp2'],
          'איש קשר': ['recABC'],
          'מקור': 'Webhook',
        },
      },
    ];
    mockAll.mockResolvedValueOnce(mockRecords);

    const result = await getContactEnrollments('recABC');

    expect(result[0].source).toBe('webhook');
  });

  it('maps מקור ידני to manual source', async () => {
    const mockRecords = [
      {
        id: 'recEnroll3',
        fields: {
          'קמפיין': ['recCamp3'],
          'איש קשר': ['recABC'],
          'מקור': 'ידני',
        },
      },
    ];
    mockAll.mockResolvedValueOnce(mockRecords);

    const result = await getContactEnrollments('recABC');

    expect(result[0].source).toBe('manual');
  });

  it('returns empty array when no enrollments found', async () => {
    mockAll.mockResolvedValueOnce([]);

    const result = await getContactEnrollments('recNONE');

    expect(result).toEqual([]);
  });
});

describe('getContactMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses FIND ARRAYJOIN filterByFormula for linked record field', async () => {
    mockAll.mockResolvedValueOnce([]);

    await getContactMessages('recABC');

    expect(mockSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        filterByFormula: 'FIND("recABC", ARRAYJOIN({איש קשר}))',
      })
    );
  });

  it('queries the ScheduledMessages table', async () => {
    mockAll.mockResolvedValueOnce([]);

    await getContactMessages('recABC');

    expect(mockTable).toHaveBeenCalledWith('ScheduledMessages');
  });

  it('maps תזמון offset labels correctly', async () => {
    const makeRecord = (id: string, timing: string) => ({
      id,
      fields: {
        'קמפיין': ['recCamp1'],
        'איש קשר': ['recABC'],
        'תוכן ההודעה': 'תוכן הודעה לדוגמה',
        'שליחה בשעה': '2026-04-01T08:00:00.000Z',
        'תזמון': timing,
        'סטטוס': 'ממתינה',
      },
    });

    const cases: Array<[string, number]> = [
      ['1', 1],
      ['2', 2],
      ['3', 3],
      ['4', 4],
    ];

    for (const [slotStr, expectedIndex] of cases) {
      jest.clearAllMocks();
      mockAll.mockResolvedValueOnce([makeRecord('recMsg1', slotStr)]);

      const result = await getContactMessages('recABC');

      expect(result[0].slot_index).toBe(expectedIndex);
    }
  });

  it('maps סטטוס values correctly', async () => {
    const makeRecord = (id: string, status: string) => ({
      id,
      fields: {
        'קמפיין': ['recCamp1'],
        'איש קשר': ['recABC'],
        'תוכן ההודעה': 'תוכן',
        'שליחה בשעה': '2026-04-01T08:00:00.000Z',
        'תזמון': 'יום לפני',
        'סטטוס': status,
      },
    });

    const cases: Array<[string, ScheduledMessage['status']]> = [
      ['ממתינה', 'pending'],
      ['שולח', 'sending'],
      ['נשלחה', 'sent'],
      ['נכשלה', 'failed'],
    ];

    for (const [hebrewStatus, expectedStatus] of cases) {
      jest.clearAllMocks();
      mockAll.mockResolvedValueOnce([makeRecord('recMsg2', hebrewStatus)]);

      const result = await getContactMessages('recABC');

      expect(result[0].status).toBe(expectedStatus);
    }
  });

  it('maps full ScheduledMessage record correctly', async () => {
    const mockRecords = [
      {
        id: 'recMsg3',
        fields: {
          'קמפיין': ['recCamp1'],
          'איש קשר': ['recABC'],
          'תוכן ההודעה': 'שלום! תזכורת לאירוע',
          'שליחה בשעה': '2026-04-01T08:00:00.000Z',
          'תזמון': '3',
          'כותרת': 'בוקר האירוע',
          'סטטוס': 'נשלחה',
          'נשלח בשעה': '2026-04-01T08:01:00.000Z',
        },
      },
    ];
    mockAll.mockResolvedValueOnce(mockRecords);

    const result = await getContactMessages('recABC');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<ScheduledMessage>({
      id: 'recMsg3',
      campaign_id: ['recCamp1'],
      contact_id: ['recABC'],
      title: 'בוקר האירוע',
      message_content: 'שלום! תזכורת לאירוע',
      send_date: '',
      send_time: '09:00',
      slot_index: 3,
      status: 'sent',
      sent_at: '2026-04-01T08:01:00.000Z',
    });
  });

  it('returns empty array when no messages found', async () => {
    mockAll.mockResolvedValueOnce([]);

    const result = await getContactMessages('recNONE');

    expect(result).toEqual([]);
  });
});

// ─── aggregateByMonth pure function tests ────────────────────────────────────

import { aggregateByMonth } from '@/components/contacts/ContactsPageClient';

function makeContact(created_at: string): import('../types').Contact {
  return { id: 'rec', full_name: 'Test', phone: '972500000000', created_at };
}

describe('aggregateByMonth', () => {
  it('groups contacts by month, newest first', () => {
    const contacts = [
      makeContact('2026-01-05T10:00:00.000Z'),
      makeContact('2026-01-15T10:00:00.000Z'),
      makeContact('2026-01-25T10:00:00.000Z'),
      makeContact('2026-02-03T10:00:00.000Z'),
      makeContact('2026-02-14T10:00:00.000Z'),
    ];
    const result = aggregateByMonth(contacts, '', '');
    expect(result).toEqual([
      { key: '2026-02', count: 2 },
      { key: '2026-01', count: 3 },
    ]);
  });

  it('excludes contacts outside from/to date range', () => {
    const contacts = [
      makeContact('2026-01-10T10:00:00.000Z'),
      makeContact('2026-02-10T10:00:00.000Z'),
      makeContact('2026-03-10T10:00:00.000Z'),
    ];
    const result = aggregateByMonth(contacts, '2026-02-01', '2026-02-28');
    expect(result).toEqual([{ key: '2026-02', count: 1 }]);
  });

  it('does not include months with zero contacts', () => {
    const contacts = [
      makeContact('2026-01-10T10:00:00.000Z'),
      makeContact('2026-03-10T10:00:00.000Z'),
    ];
    const result = aggregateByMonth(contacts, '', '');
    // February is missing — no zero-count rows
    expect(result.every((r) => r.count > 0)).toBe(true);
    expect(result.find((r) => r.key === '2026-02')).toBeUndefined();
  });

  it('returns empty array for empty contacts', () => {
    expect(aggregateByMonth([], '', '')).toEqual([]);
  });

  it('includes all contacts when from and to are both empty', () => {
    const contacts = [
      makeContact('2025-11-01T10:00:00.000Z'),
      makeContact('2026-01-01T10:00:00.000Z'),
    ];
    const result = aggregateByMonth(contacts, '', '');
    expect(result).toHaveLength(2);
  });

  it('returns single-element array for a single contact', () => {
    const contacts = [makeContact('2026-03-07T10:00:00.000Z')];
    const result = aggregateByMonth(contacts, '', '');
    expect(result).toEqual([{ key: '2026-03', count: 1 }]);
  });

  it('filters 4-month span to only 2 months when date range is applied', () => {
    const contacts = [
      makeContact('2026-01-10T10:00:00.000Z'),
      makeContact('2026-02-10T10:00:00.000Z'),
      makeContact('2026-03-10T10:00:00.000Z'),
      makeContact('2026-04-10T10:00:00.000Z'),
    ];
    const result = aggregateByMonth(contacts, '2026-02-01', '2026-03-31');
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.key)).toEqual(['2026-03', '2026-02']);
  });
});
