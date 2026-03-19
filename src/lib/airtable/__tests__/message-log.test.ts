/**
 * Unit tests for message-log Airtable service and error mapper.
 * TDD RED → GREEN cycle for Phase 5 monitoring data layer.
 */

const mockAll = jest.fn();
const mockCreate = jest.fn();
const mockSelect = jest.fn(() => ({ all: mockAll }));
const mockTable = jest.fn(() => ({
  select: mockSelect,
  create: mockCreate,
}));

jest.mock('../client', () => ({ airtableBase: mockTable }));

import { getMessageLogByCampaign, mapErrorToHebrew } from '../message-log';

// ---------------------------------------------------------------------------
// Shared mock record factory
// ---------------------------------------------------------------------------
function makeRecord(overrides: Partial<{
  id: string;
  createdTime: string;
  status: string;
  contactId: string;
  fullName: string;
  phone: string;
  errorMessage: string;
}> = {}) {
  const {
    id = 'recABC',
    createdTime = '2026-03-18T10:00:00.000Z',
    status = 'נשלחה',
    contactId = 'recContact1',
    fullName = 'שרה כהן',
    phone = '0501234567',
    errorMessage,
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
  });

  it('calls airtableBase with MessageLog table', async () => {
    mockAll.mockResolvedValue([]);
    await getMessageLogByCampaign('recCampaign1');
    expect(mockTable).toHaveBeenCalledWith('MessageLog');
  });

  it('uses FIND+ARRAYJOIN filterByFormula with campaignId', async () => {
    mockAll.mockResolvedValue([]);
    await getMessageLogByCampaign('recCampaign123');
    const selectCall = mockSelect.mock.calls[0][0];
    expect(selectCall.filterByFormula).toContain('recCampaign123');
    expect(selectCall.filterByFormula).toMatch(/FIND.*ARRAYJOIN/i);
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
// mapErrorToHebrew
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
// getCampaignLogAction (server action)
// ---------------------------------------------------------------------------
jest.mock('../message-log', () => ({
  ...jest.requireActual('../message-log'),
  getMessageLogByCampaign: jest.fn(),
}));

import { getCampaignLogAction } from '../../../app/kampanim/actions';
import { getMessageLogByCampaign as mockGetLog } from '../message-log';

const mockGetLogFn = mockGetLog as jest.MockedFunction<typeof getMessageLogByCampaign>;

describe('getCampaignLogAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    mockGetLogFn.mockResolvedValue(fakeEntries);

    const result = await getCampaignLogAction('recCampaign1');
    expect(result).toEqual({ entries: fakeEntries });
  });

  it('returns { error } when getMessageLogByCampaign throws', async () => {
    mockGetLogFn.mockRejectedValue(new Error('Airtable down'));

    const result = await getCampaignLogAction('recCampaign1');
    expect(result).toHaveProperty('error');
  });
});
