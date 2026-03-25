/**
 * Unit tests for message-log Airtable service and error mapper.
 * TDD RED → GREEN cycle for Phase 5 monitoring data layer.
 */

// ---------------------------------------------------------------------------
// Mock setup — must be at top before any imports
// ---------------------------------------------------------------------------
const mockAll = jest.fn();
const mockCreate = jest.fn();
const mockSelect = jest.fn(() => ({ all: mockAll }));
const mockTable = jest.fn(() => ({
  select: mockSelect,
  create: mockCreate,
}));

jest.mock('../client', () => ({ airtableBase: mockTable }));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import { getMessageLogByCampaign, mapErrorToHebrew } from '../message-log';
import { getCampaignLogAction } from '../../../app/kampanim/actions';

// ---------------------------------------------------------------------------
// Shared mock record factory
// ---------------------------------------------------------------------------
function makeRecord(overrides: Partial<{
  id: string;
  createdTime: string;
  status: string;
  contactId: string;
  fullName: string | undefined;
  phone: string | undefined;
  errorMessage: string | undefined;
}> = {}) {
  const {
    id = 'recABC',
    createdTime = '2026-03-18T10:00:00.000Z',
    status = 'נשלחה',
    contactId = 'recContact1',
    fullName = 'שרה כהן',
    phone = '0501234567',
    errorMessage = undefined,
  } = overrides;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const record: any = {
    id,
    _rawJson: { id, createdTime, fields: {} },
    fields: {
      'סטטוס': status,
      'איש קשר': [contactId],
    },
  };

  if (fullName !== undefined) record.fields['שם מלא'] = fullName;
  if (phone !== undefined) record.fields['טלפון'] = phone;
  if (errorMessage !== undefined) record.fields['הודעת שגיאה'] = errorMessage;

  return record;
}

// ---------------------------------------------------------------------------
// getMessageLogByCampaign
// ---------------------------------------------------------------------------
describe('getMessageLogByCampaign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTable.mockImplementation(() => ({ select: mockSelect, create: mockCreate }));
    mockSelect.mockImplementation(() => ({ all: mockAll }));
  });

  it('calls airtableBase with MessageLog table', async () => {
    mockAll.mockResolvedValue([]);
    await getMessageLogByCampaign('recCampaign1');
    expect(mockTable).toHaveBeenCalledWith('MessageLog');
  });

  it('uses FIND+ARRAYJOIN filterByFormula with campaignId', async () => {
    mockAll.mockResolvedValue([]);
    await getMessageLogByCampaign('recCampaign123');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selectCall = (mockSelect.mock.calls as any[][])[0]?.[0] as { filterByFormula: string } | undefined;
    expect(selectCall?.filterByFormula).toContain('recCampaign123');
    expect(selectCall?.filterByFormula).toMatch(/FIND.*ARRAYJOIN/i);
  });

  it('maps "נשלחה" status to "sent"', async () => {
    mockAll.mockResolvedValue([makeRecord({ status: 'נשלחה' })]);
    const result = await getMessageLogByCampaign('recCampaign1');
    expect(result[0].status).toBe('sent');
  });

  it('maps "נכשלה" status to "failed"', async () => {
    mockAll.mockResolvedValue([makeRecord({ status: 'נכשלה' })]);
    const result = await getMessageLogByCampaign('recCampaign1');
    expect(result[0].status).toBe('failed');
  });

  it('returns logged_at from _rawJson.createdTime', async () => {
    mockAll.mockResolvedValue([makeRecord({ createdTime: '2026-03-18T10:00:00.000Z' })]);
    const result = await getMessageLogByCampaign('recCampaign1');
    expect(result[0].logged_at).toBe('2026-03-18T10:00:00.000Z');
  });

  it('returns contact_id from "איש קשר" linked field', async () => {
    mockAll.mockResolvedValue([makeRecord({ contactId: 'recContactABC' })]);
    const result = await getMessageLogByCampaign('recCampaign1');
    expect(result[0].contact_id).toBe('recContactABC');
  });

  it('returns full_name from "שם מלא" lookup field', async () => {
    mockAll.mockResolvedValue([makeRecord({ fullName: 'מיכל לוי' })]);
    const result = await getMessageLogByCampaign('recCampaign1');
    expect(result[0].full_name).toBe('מיכל לוי');
  });

  it('returns phone from "טלפון" lookup field', async () => {
    mockAll.mockResolvedValue([makeRecord({ phone: '0521234567' })]);
    const result = await getMessageLogByCampaign('recCampaign1');
    expect(result[0].phone).toBe('0521234567');
  });

  it('returns error_message from "הודעת שגיאה" field', async () => {
    mockAll.mockResolvedValue([makeRecord({ status: 'נכשלה', errorMessage: 'GREEN API 401' })]);
    const result = await getMessageLogByCampaign('recCampaign1');
    expect(result[0].error_message).toBe('GREEN API 401');
  });

  it('returns empty array when no records found', async () => {
    mockAll.mockResolvedValue([]);
    const result = await getMessageLogByCampaign('recCampaign1');
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// mapErrorToHebrew — pure function, no mocks needed
// ---------------------------------------------------------------------------
describe('mapErrorToHebrew', () => {
  it('returns empty string for undefined input', () => {
    expect(mapErrorToHebrew(undefined)).toBe('');
  });

  it('maps 401/notAuthorized error to "גרין אפיאי מנותקת"', () => {
    expect(mapErrorToHebrew('GREEN API error 401: notAuthorized')).toContain('גרין אפיאי מנותקת');
  });

  it('maps unauthorized error to "גרין אפיאי מנותקת"', () => {
    expect(mapErrorToHebrew('Unauthorized access denied')).toContain('גרין אפיאי מנותקת');
  });

  it('maps 403/not-registered error to "מספר הטלפון לא קיים בוואצאפ"', () => {
    expect(mapErrorToHebrew('GREEN API error 403: not registered')).toContain('מספר הטלפון לא קיים בוואצאפ');
  });

  it('maps network/timeout error to "בעיית תקשורת זמנית"', () => {
    expect(mapErrorToHebrew('fetch failed timeout')).toContain('בעיית תקשורת זמנית');
  });

  it('returns "שגיאה לא ידועה" for unknown error strings', () => {
    expect(mapErrorToHebrew('some random error xyz')).toContain('שגיאה לא ידועה');
  });
});

// ---------------------------------------------------------------------------
// getMessagesSentThisMonth
// ---------------------------------------------------------------------------
import { getMessagesSentThisMonth, getMessageLogSentCountsByCampaign } from '../message-log';

describe('getMessagesSentThisMonth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTable.mockImplementation(() => ({ select: mockSelect, create: mockCreate }));
    mockSelect.mockImplementation(() => ({ all: mockAll }));
  });

  it('returns count of sent records this month', async () => {
    mockAll.mockResolvedValue([
      { id: 'recA', fields: { 'סטטוס': 'נשלחה' } },
      { id: 'recB', fields: { 'סטטוס': 'נשלחה' } },
    ]);
    const result = await getMessagesSentThisMonth();
    expect(result).toBe(2);
  });

  it('returns 0 when no records match', async () => {
    mockAll.mockResolvedValue([]);
    const result = await getMessagesSentThisMonth();
    expect(result).toBe(0);
  });

  it('calls airtableBase with יומן הודעות table', async () => {
    mockAll.mockResolvedValue([]);
    await getMessagesSentThisMonth();
    expect(mockTable).toHaveBeenCalledWith('יומן הודעות');
  });

  it('uses IS_AFTER/IS_BEFORE with current month boundaries in filterByFormula', async () => {
    mockAll.mockResolvedValue([]);
    await getMessagesSentThisMonth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selectCall = (mockSelect.mock.calls as any[][])[0]?.[0] as { filterByFormula: string } | undefined;
    expect(selectCall?.filterByFormula).toContain('IS_AFTER');
    expect(selectCall?.filterByFormula).toContain('IS_BEFORE');
    expect(selectCall?.filterByFormula).toContain('נשלחה');
  });
});

// ---------------------------------------------------------------------------
// getMessageLogSentCountsByCampaign
// ---------------------------------------------------------------------------
describe('getMessageLogSentCountsByCampaign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTable.mockImplementation(() => ({ select: mockSelect, create: mockCreate }));
    mockSelect.mockImplementation(() => ({ all: mockAll }));
  });

  it('returns correct aggregated counts per campaign', async () => {
    mockAll.mockResolvedValue([
      { id: 'recA', fields: { 'סטטוס': 'נשלחה', 'קמפיין': ['recCamp1', 'recCamp2'] } },
      { id: 'recB', fields: { 'סטטוס': 'נשלחה', 'קמפיין': ['recCamp1'] } },
    ]);
    const result = await getMessageLogSentCountsByCampaign();
    expect(result['recCamp1']).toBe(2);
    expect(result['recCamp2']).toBe(1);
  });

  it('returns empty object when no sent records exist', async () => {
    mockAll.mockResolvedValue([]);
    const result = await getMessageLogSentCountsByCampaign();
    expect(result).toEqual({});
  });

  it('filters by {סטטוס} = נשלחה', async () => {
    mockAll.mockResolvedValue([]);
    await getMessageLogSentCountsByCampaign();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selectCall = (mockSelect.mock.calls as any[][])[0]?.[0] as { filterByFormula: string } | undefined;
    expect(selectCall?.filterByFormula).toContain('נשלחה');
  });

  it('handles records with no קמפיין field gracefully', async () => {
    mockAll.mockResolvedValue([
      { id: 'recA', fields: { 'סטטוס': 'נשלחה' } },
    ]);
    const result = await getMessageLogSentCountsByCampaign();
    expect(result).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// getCampaignLogAction — mock getMessageLogByCampaign via jest.spyOn
// ---------------------------------------------------------------------------
describe('getCampaignLogAction', () => {
  let getLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const messageLogModule = require('../message-log');
    getLogSpy = jest.spyOn(messageLogModule, 'getMessageLogByCampaign');
  });

  afterEach(() => {
    getLogSpy.mockRestore();
  });

  it('returns { error } when campaignId is empty', async () => {
    const result = await getCampaignLogAction('');
    expect(result).toEqual({ error: 'campaignId is required' });
  });

  it('returns { entries } on success', async () => {
    const fakeEntries = [
      {
        id: 'recLog1',
        contact_id: 'recContact1',
        status: 'sent' as const,
        logged_at: '2026-03-18T10:00:00.000Z',
      },
    ];
    getLogSpy.mockResolvedValue(fakeEntries);

    const result = await getCampaignLogAction('recCampaign1');
    expect(result).toEqual({ entries: fakeEntries });
  });

  it('returns { error } when getMessageLogByCampaign throws', async () => {
    getLogSpy.mockRejectedValue(new Error('Airtable down'));

    const result = await getCampaignLogAction('recCampaign1');
    expect(result).toHaveProperty('error');
  });
});
