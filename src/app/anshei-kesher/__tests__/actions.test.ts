/**
 * Unit tests for addContact Server Action
 * Tests duplicate detection, validation, and successful contact creation
 */

// Mock modules before imports
const mockGetContacts = jest.fn();
const mockCreateContact = jest.fn();
const mockRevalidatePath = jest.fn();
const mockNormalizePhone = jest.fn();

jest.mock('@/lib/airtable/contacts', () => ({
  getContacts: mockGetContacts,
  createContact: mockCreateContact,
}));

jest.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

jest.mock('@/lib/airtable/phone', () => ({
  normalizePhone: mockNormalizePhone,
}));

// Must import after mocks are set up
import { addContact } from '../actions';

describe('addContact', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: normalizePhone returns the stripped/normalized version
    mockNormalizePhone.mockImplementation((phone: string) => {
      // Simple normalization for tests: strip non-digits and prefix 972
      const digits = phone.replace(/\D/g, '');
      if (digits.startsWith('972')) return digits;
      if (digits.startsWith('0')) return '972' + digits.slice(1);
      return digits;
    });
  });

  it('returns error when fullName is empty', async () => {
    const result = await addContact('', '0501234567');

    expect(result).toEqual({ error: 'שם מלא נדרש' });
    expect(mockGetContacts).not.toHaveBeenCalled();
  });

  it('returns error when fullName is whitespace only', async () => {
    const result = await addContact('   ', '0501234567');

    expect(result).toEqual({ error: 'שם מלא נדרש' });
    expect(mockGetContacts).not.toHaveBeenCalled();
  });

  it('returns Hebrew duplicate error when phone already exists', async () => {
    // Existing contact stored with normalized phone
    mockGetContacts.mockResolvedValueOnce([
      {
        id: 'rec001',
        full_name: 'רחל כהן',
        phone: '972501234567',
        created_at: '2026-03-01T00:00:00.000Z',
      },
    ]);

    // Incoming phone in display format — normalizePhone will normalize it
    const result = await addContact('שרה לוי', '050-123-4567');

    expect(result).toEqual({ error: 'המספר כבר קיים במערכת' });
    expect(mockCreateContact).not.toHaveBeenCalled();
  });

  it('normalizes both incoming and existing phones before comparing', async () => {
    // Existing phone is already normalized (972XXXXXXXXXX)
    mockGetContacts.mockResolvedValueOnce([
      {
        id: 'rec002',
        full_name: 'מרים לוי',
        phone: '972501234567',
        created_at: '2026-03-01T00:00:00.000Z',
      },
    ]);

    // Incoming in dashed local format — should match after normalization
    const result = await addContact('חנה כהן', '050-123-4567');

    expect(result).toEqual({ error: 'המספר כבר קיים במערכת' });
    // normalizePhone called at least twice: once for incoming, once per existing contact
    expect(mockNormalizePhone).toHaveBeenCalledWith('050-123-4567');
    expect(mockNormalizePhone).toHaveBeenCalledWith('972501234567');
  });

  it('calls createContact and revalidatePath on success', async () => {
    mockGetContacts.mockResolvedValueOnce([]);
    mockCreateContact.mockResolvedValueOnce({ success: true });

    const result = await addContact('שרה לוי', '0509876543');

    expect(mockCreateContact).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/anshei-kesher');
    expect(result).toEqual({ success: true });
  });

  it('trims whitespace from fullName before saving', async () => {
    mockGetContacts.mockResolvedValueOnce([]);
    mockCreateContact.mockResolvedValueOnce({ success: true });

    await addContact('  שרה לוי  ', '0509876543');

    expect(mockCreateContact).toHaveBeenCalledWith(
      expect.objectContaining({ full_name: 'שרה לוי' })
    );
  });
});
