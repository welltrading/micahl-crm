/**
 * Unit tests for scheduler-services Airtable service layer.
 * Tests mock airtableBase — no real Airtable calls.
 */

const mockAll = jest.fn();
const mockUpdate = jest.fn();
const mockCreate = jest.fn();
const mockSelect = jest.fn(() => ({ all: mockAll }));
const mockTable = jest.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
  create: mockCreate,
}));

jest.mock('../client', () => ({
  airtableBase: mockTable,
}));

import {
  getPendingMessagesDue,
  markMessageSending,
  markMessageSent,
  markMessageFailed,
  resetStuckSendingMessages,
  getEnrollmentsForCampaign,
} from '../scheduler-services';

const NOW_ISO = '2026-04-01T10:00:00.000Z';

describe('getPendingMessagesDue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries ScheduledMessages with filterByFormula containing "ממתינה" and "IS_BEFORE"', async () => {
    mockAll.mockResolvedValueOnce([]);

    await getPendingMessagesDue(NOW_ISO);

    expect(mockSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        filterByFormula: expect.stringContaining('ממתינה'),
      })
    );
    expect(mockSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        filterByFormula: expect.stringContaining('IS_BEFORE'),
      })
    );
  });

  it('queries the ScheduledMessages table', async () => {
    mockAll.mockResolvedValueOnce([]);

    await getPendingMessagesDue(NOW_ISO);

    expect(mockTable).toHaveBeenCalledWith('ScheduledMessages');
  });

  it('maps Airtable records to ScheduledMessage type', async () => {
    mockAll.mockResolvedValueOnce([
      {
        id: 'recMsg1',
        fields: {
          'קמפיין': ['recCamp1'],
          'איש קשר': ['recContact1'],
          'כותרת': 'הודעה ראשונה',
          'תוכן ההודעה': 'שלום!',
          'שליחה בשעה': '2026-04-01T09:00:00.000Z',
          'מספר הודעה': '1',
          'סטטוס': 'ממתינה',
        },
      },
    ]);

    const result = await getPendingMessagesDue(NOW_ISO);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('recMsg1');
    expect(result[0].status).toBe('pending');
    expect(result[0].campaign_id).toEqual(['recCamp1']);
  });
});

describe('markMessageSending', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls update on ScheduledMessages with status "בשליחה"', async () => {
    mockUpdate.mockResolvedValueOnce({});

    await markMessageSending('recMsg1');

    expect(mockUpdate).toHaveBeenCalledWith('recMsg1', { 'סטטוס': 'בשליחה' });
    expect(mockTable).toHaveBeenCalledWith('ScheduledMessages');
  });
});

describe('markMessageSent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls update with status "נשלחה" and sets "נשלח בשעה" to an ISO string', async () => {
    mockUpdate.mockResolvedValueOnce({});

    await markMessageSent('recMsg2');

    expect(mockUpdate).toHaveBeenCalledWith(
      'recMsg2',
      expect.objectContaining({
        'סטטוס': 'נשלחה',
        'נשלח בשעה': expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      })
    );
  });
});

describe('markMessageFailed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls update on ScheduledMessages with status "נכשלה"', async () => {
    mockUpdate.mockResolvedValueOnce({});

    await markMessageFailed('recMsg3');

    expect(mockUpdate).toHaveBeenCalledWith('recMsg3', { 'סטטוס': 'נכשלה' });
    expect(mockTable).toHaveBeenCalledWith('ScheduledMessages');
  });
});

describe('resetStuckSendingMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('finds messages with status "בשליחה" and resets them to "ממתינה"', async () => {
    mockAll.mockResolvedValueOnce([
      { id: 'recStuck1', fields: { 'סטטוס': 'בשליחה' } },
      { id: 'recStuck2', fields: { 'סטטוס': 'בשליחה' } },
    ]);
    mockUpdate.mockResolvedValue({});

    await resetStuckSendingMessages();

    expect(mockSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        filterByFormula: expect.stringContaining('בשליחה'),
      })
    );
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockUpdate).toHaveBeenCalledWith('recStuck1', { 'סטטוס': 'ממתינה' });
    expect(mockUpdate).toHaveBeenCalledWith('recStuck2', { 'סטטוס': 'ממתינה' });
  });

  it('does nothing when there are no stuck messages', async () => {
    mockAll.mockResolvedValueOnce([]);

    await resetStuckSendingMessages();

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe('getEnrollmentsForCampaign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries CampaignEnrollments with FIND+ARRAYJOIN pattern', async () => {
    mockAll.mockResolvedValueOnce([]);

    await getEnrollmentsForCampaign('recCamp1');

    expect(mockTable).toHaveBeenCalledWith('CampaignEnrollments');
    expect(mockSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        filterByFormula: 'FIND("recCamp1", ARRAYJOIN({קמפיין}))',
      })
    );
  });

  it('maps records to CampaignEnrollment type', async () => {
    mockAll.mockResolvedValueOnce([
      {
        id: 'recEnroll1',
        fields: {
          'קמפיין': ['recCamp1'],
          'איש קשר': ['recContact1'],
          'מקור': 'ידני',
          'תאריך רישום': '2026-03-01T00:00:00.000Z',
        },
      },
    ]);

    const result = await getEnrollmentsForCampaign('recCamp1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('recEnroll1');
    expect(result[0].campaign_id).toEqual(['recCamp1']);
    expect(result[0].contact_id).toEqual(['recContact1']);
    expect(result[0].source).toBe('manual');
  });
});
