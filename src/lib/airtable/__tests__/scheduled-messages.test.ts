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

import { updateScheduledMessage } from '../scheduled-messages';


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
