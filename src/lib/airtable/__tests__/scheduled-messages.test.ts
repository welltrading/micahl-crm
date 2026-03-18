/**
 * Unit test stubs for scheduled-messages Airtable service
 * These are Wave 0 stubs — all RED until Plan 02 implements the functions.
 *
 * Tests cover:
 *   - upsertScheduledMessages: creates records for filled slots only
 *   - updateScheduledMessage: patches individual fields
 */

// Mock airtableBase before importing scheduled-messages module
const mockAll = jest.fn();
const mockFind = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockSelect = jest.fn(() => ({ all: mockAll }));
const mockTable = jest.fn(() => ({
  select: mockSelect,
  find: mockFind,
  create: mockCreate,
  update: mockUpdate,
}));

jest.mock('../client', () => ({
  airtableBase: mockTable,
}));

import { upsertScheduledMessages, updateScheduledMessage } from '../scheduled-messages';

describe('upsertScheduledMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue([]);
  });

  it('creates Airtable records for filled slots only', async () => {
    const slots = [
      { offset_label: 'week_before' as const, message_content: 'Hello', send_at: '2026-04-07T06:00:00.000Z' },
      { offset_label: 'day_before' as const, message_content: '', send_at: '2026-04-13T06:00:00.000Z' }, // empty — skip
      { offset_label: 'morning' as const, message_content: 'Good morning!', send_at: '2026-04-14T05:00:00.000Z' },
      { offset_label: 'half_hour' as const, message_content: '', send_at: '2026-04-14T15:30:00.000Z' }, // empty — skip
    ];

    await upsertScheduledMessages('recCampaign1', slots);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const createArg = mockCreate.mock.calls[0][0];
    expect(createArg).toHaveLength(2); // only 2 filled slots
  });

  it('skips slots with empty message_content', async () => {
    const slots = [
      { offset_label: 'week_before' as const, message_content: '   ', send_at: '2026-04-07T06:00:00.000Z' },
      { offset_label: 'day_before' as const, message_content: '', send_at: '2026-04-13T06:00:00.000Z' },
    ];

    await upsertScheduledMessages('recCampaign1', slots);

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('wraps campaignId in array for linked record field', async () => {
    const slots = [
      { offset_label: 'week_before' as const, message_content: 'Hello', send_at: '2026-04-07T06:00:00.000Z' },
    ];

    await upsertScheduledMessages('recCampaign123', slots);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const records = mockCreate.mock.calls[0][0];
    expect(records[0].fields['קמפיין']).toEqual(['recCampaign123']);
  });
});

describe('updateScheduledMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockResolvedValue({});
  });

  it('patches תוכן ההודעה when message_content provided', async () => {
    await updateScheduledMessage('recMsg1', { message_content: 'Updated content' });

    expect(mockUpdate).toHaveBeenCalledWith(
      'recMsg1',
      expect.objectContaining({ 'תוכן ההודעה': 'Updated content' })
    );
  });

  it('patches שליחה בשעה when send_at provided', async () => {
    await updateScheduledMessage('recMsg1', { send_at: '2026-04-07T06:00:00.000Z' });

    expect(mockUpdate).toHaveBeenCalledWith(
      'recMsg1',
      expect.objectContaining({ 'שליחה בשעה': '2026-04-07T06:00:00.000Z' })
    );
  });
});
