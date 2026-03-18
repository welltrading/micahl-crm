/**
 * Unit tests for phone utility functions
 * normalizePhone: converts any Israeli mobile format to 972XXXXXXXXXX
 * formatPhoneDisplay: converts 972XXXXXXXXXX back to 0XX-XXX-XXXX for UI display
 */

import { normalizePhone, formatPhoneDisplay } from '../phone';

describe('normalizePhone', () => {
  it('normalizes dashed format 050-123-4567 to 972501234567', () => {
    expect(normalizePhone('050-123-4567')).toBe('972501234567');
  });

  it('normalizes local format 0501234567 to 972501234567', () => {
    expect(normalizePhone('0501234567')).toBe('972501234567');
  });

  it('normalizes +972 prefix format +972501234567 to 972501234567', () => {
    expect(normalizePhone('+972501234567')).toBe('972501234567');
  });

  it('returns already-normalized 972XXXXXXXXXX unchanged', () => {
    expect(normalizePhone('972501234567')).toBe('972501234567');
  });

  it('throws or returns empty string for invalid input', () => {
    expect(() => normalizePhone('')).toThrow();
  });

  it('throws or returns empty string for non-phone input', () => {
    expect(() => normalizePhone('notaphone')).toThrow();
  });
});

describe('formatPhoneDisplay', () => {
  it('formats 972501234567 to 050-123-4567', () => {
    expect(formatPhoneDisplay('972501234567')).toBe('050-123-4567');
  });

  it('formats 972521234567 to 052-123-4567', () => {
    expect(formatPhoneDisplay('972521234567')).toBe('052-123-4567');
  });
});
