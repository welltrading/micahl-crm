/**
 * Unit tests for scheduled-messages Airtable service
 */

const mockAll = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDestroy = jest.fn();
const mockSelect = jest.fn(() => ({ all: mockAll }));
const mockTable = jest.fn(() => ({
  select: mockSelect,
  create: mockCreate,
  update: mockUpdate,
  destroy: mockDestroy,
}));

jest.mock('../client', () => ({ airtableBase: mockTable }));

import { upsertScheduledMessages, updateScheduledMessage } from '../scheduled-messages';

const BASE_SLOT = { slot_index: 1, title: 'test', message_content: 'Hello', send_date: '2026-04-07', send_time: '09:00' };

describe('upsertScheduledMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAll.mockResolvedValue([]); // no existing records
    mockCreate.mockResolvedValue([]);
    mockUpdate.mockResolvedValue([]);
    mockDestroy.mockResolvedValue([]);
  });

  it('creates records for filled slots only', async () => {
    const slots = [
      { slot_index: 1, title: 'ראשונה', message_content: 'Hello', send_date: '2026-04-07', send_time: '09:00' },
      { slot_index: 2, title: 'שנייה', message_content: '', send_date: '2026-04-13', send_time: '09:00' },
      { slot_index: 3, title: 'שלישית', message_content: 'Good morning!', send_date: '2026-04-14', send_time: '08:00' },
    ];

    await upsertScheduledMessages('recCampaign1', slots);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0]).toHaveLength(2);
  });

  it('skips slots with empty message_content', async () => {
    const slots = [
      { slot_index: 1, title: '', message_content: '   ', send_date: '2026-04-07', send_time: '09:00' },
      { slot_index: 2, title: '', message_content: '', send_date: '2026-04-13', send_time: '09:00' },
    ];

    await upsertScheduledMessages('recCampaign1', slots);

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('wraps campaignId in array for linked record field', async () => {
    await upsertScheduledMessages('recCampaign123', [BASE_SLOT]);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0][0].fields['קמפיין']).toEqual(['recCampaign123']);
    // שליחה בשעה must be populated with UTC value
    // BASE_SLOT: send_date '2026-04-07', send_time '09:00' IDT (UTC+3) → UTC 06:00
    expect(mockCreate.mock.calls[0][0][0].fields['שליחה בשעה']).toBe('2026-04-07T06:00:00.000Z');
  });

  it('updates existing record when slot_index already exists', async () => {
    mockAll.mockResolvedValue([
      { id: 'recExisting1', fields: { 'מספר הודעה': '1' } },
    ]);

    await upsertScheduledMessages('recCampaign1', [BASE_SLOT]);

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][0][0].id).toBe('recExisting1');
    // שליחה בשעה must be populated in update path too
    expect(mockUpdate.mock.calls[0][0][0].fields['שליחה בשעה']).toBeTruthy();
  });

  it('updates by recordId even when slot_index does not match existing', async () => {
    // Simulates old records with non-numeric מספר הודעה (won't be found by slot_index)
    mockAll.mockResolvedValue([
      { id: 'recOldRecord', fields: { 'מספר הודעה': 'שבוע לפני' } },
    ]);

    await upsertScheduledMessages('recCampaign1', [{ ...BASE_SLOT, recordId: 'recOldRecord' }]);

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][0][0].id).toBe('recOldRecord');
  });

  it('deletes duplicate records and keeps only one per slot_index', async () => {
    mockAll.mockResolvedValue([
      { id: 'recDup1', fields: { 'מספר הודעה': '2' } },
      { id: 'recDup2', fields: { 'מספר הודעה': '2' } },
    ]);

    await upsertScheduledMessages('recCampaign1', [{ ...BASE_SLOT, slot_index: 2 }]);

    expect(mockDestroy).toHaveBeenCalledTimes(1);
    expect(mockDestroy.mock.calls[0][0]).toHaveLength(1); // one duplicate deleted
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('prefers slot.recordId when choosing which duplicate to keep', async () => {
    mockAll.mockResolvedValue([
      { id: 'recOld', fields: { 'מספר הודעה': '1' } },
      { id: 'recNew', fields: { 'מספר הודעה': '1' } },
    ]);

    await upsertScheduledMessages('recCampaign1', [{ ...BASE_SLOT, recordId: 'recNew' }]);

    expect(mockDestroy.mock.calls[0][0]).toContain('recOld');
    expect(mockUpdate.mock.calls[0][0][0].id).toBe('recNew');
  });
});

describe('updateScheduledMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockResolvedValue({});
  });

  it('patches תוכן ההודעה when message_content provided', async () => {
    await updateScheduledMessage('recMsg1', { message_content: 'Updated content' });
    expect(mockUpdate).toHaveBeenCalledWith('recMsg1', expect.objectContaining({ 'תוכן ההודעה': 'Updated content' }));
  });

  it('patches כותרת when title provided', async () => {
    await updateScheduledMessage('recMsg1', { title: 'כותרת חדשה' });
    expect(mockUpdate).toHaveBeenCalledWith('recMsg1', expect.objectContaining({ 'כותרת': 'כותרת חדשה' }));
  });

  it('writes שליחה בשעה when send_date and send_time both provided', async () => {
    await updateScheduledMessage('recMsg1', { send_date: '2026-04-07', send_time: '09:00' });
    expect(mockUpdate).toHaveBeenCalledWith(
      'recMsg1',
      expect.objectContaining({ 'שליחה בשעה': '2026-04-07T06:00:00.000Z' })
    );
  });

  it('does NOT write שליחה בשעה when only message_content is updated', async () => {
    await updateScheduledMessage('recMsg1', { message_content: 'New content' });
    const calledWith = mockUpdate.mock.calls[0][1];
    expect(calledWith).not.toHaveProperty('שליחה בשעה');
  });
});
