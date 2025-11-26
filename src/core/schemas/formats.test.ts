import { describe, it, expect } from 'vitest';
import { BOOK_FORMATS, getAspectRatio, BookFormatKeySchema } from './formats';

describe('BOOK_FORMATS', () => {
  it('has all 5 format presets', () => {
    const formatKeys = Object.keys(BOOK_FORMATS);

    expect(formatKeys).toHaveLength(5);
    expect(formatKeys).toContain('square-small');
    expect(formatKeys).toContain('square-large');
    expect(formatKeys).toContain('landscape');
    expect(formatKeys).toContain('portrait-small');
    expect(formatKeys).toContain('portrait-large');
  });

  it('has required dimensions for all formats', () => {
    for (const [key, format] of Object.entries(BOOK_FORMATS)) {
      expect(format.name).toBeDefined();
      expect(format.trimWidth).toBeGreaterThan(0);
      expect(format.trimHeight).toBeGreaterThan(0);
      expect(format.bleedWidth).toBeGreaterThan(0);
      expect(format.bleedHeight).toBeGreaterThan(0);
    }
  });

  it('has bleed dimensions larger than trim dimensions', () => {
    for (const [key, format] of Object.entries(BOOK_FORMATS)) {
      expect(format.bleedWidth).toBeGreaterThan(format.trimWidth);
      expect(format.bleedHeight).toBeGreaterThan(format.trimHeight);
    }
  });

  it('has square formats with equal width and height', () => {
    expect(BOOK_FORMATS['square-small'].trimWidth).toBe(
      BOOK_FORMATS['square-small'].trimHeight
    );
    expect(BOOK_FORMATS['square-large'].trimWidth).toBe(
      BOOK_FORMATS['square-large'].trimHeight
    );
  });

  it('has landscape format wider than tall', () => {
    expect(BOOK_FORMATS['landscape'].trimWidth).toBeGreaterThan(
      BOOK_FORMATS['landscape'].trimHeight
    );
  });

  it('has portrait formats taller than wide', () => {
    expect(BOOK_FORMATS['portrait-small'].trimHeight).toBeGreaterThan(
      BOOK_FORMATS['portrait-small'].trimWidth
    );
    expect(BOOK_FORMATS['portrait-large'].trimHeight).toBeGreaterThan(
      BOOK_FORMATS['portrait-large'].trimWidth
    );
  });
});

describe('getAspectRatio', () => {
  it('returns 1:1 for square-small format', () => {
    expect(getAspectRatio(BOOK_FORMATS['square-small'])).toBe('1:1');
  });

  it('returns 1:1 for square-large format', () => {
    expect(getAspectRatio(BOOK_FORMATS['square-large'])).toBe('1:1');
  });

  it('returns 4:3 for landscape format', () => {
    expect(getAspectRatio(BOOK_FORMATS['landscape'])).toBe('4:3');
  });

  it('returns 3:4 for portrait-small format', () => {
    expect(getAspectRatio(BOOK_FORMATS['portrait-small'])).toBe('3:4');
  });

  it('returns 3:4 for portrait-large format', () => {
    expect(getAspectRatio(BOOK_FORMATS['portrait-large'])).toBe('3:4');
  });

  it('returns 4:3 for custom wide format', () => {
    const wideFormat = {
      bleedWidth: 1650,
      bleedHeight: 1250,
    };

    expect(getAspectRatio(wideFormat)).toBe('4:3');
  });

  it('returns 3:4 for custom tall format', () => {
    const tallFormat = {
      bleedWidth: 950,
      bleedHeight: 1250,
    };

    expect(getAspectRatio(tallFormat)).toBe('3:4');
  });

  it('returns default 4:3 for unmapped wide ratio', () => {
    // Create format with 5:4 ratio which doesn't match any standard closely
    const customFormat = {
      bleedWidth: 500,
      bleedHeight: 400,
    };

    // Should fall back to 4:3 for wide formats (5:4 = 1.25 is not close to any standard)
    expect(getAspectRatio(customFormat)).toBe('4:3');
  });

  it('returns default 3:4 for unmapped tall ratio', () => {
    // Create format with 4:5 ratio which doesn't match any standard closely
    const customFormat = {
      bleedWidth: 400,
      bleedHeight: 500,
    };

    // Should fall back to 3:4 for tall formats (4:5 = 0.8 is not close to any standard)
    expect(getAspectRatio(customFormat)).toBe('3:4');
  });
});

describe('BookFormatKeySchema', () => {
  it('accepts valid format keys', () => {
    expect(BookFormatKeySchema.parse('square-small')).toBe('square-small');
    expect(BookFormatKeySchema.parse('square-large')).toBe('square-large');
    expect(BookFormatKeySchema.parse('landscape')).toBe('landscape');
    expect(BookFormatKeySchema.parse('portrait-small')).toBe('portrait-small');
    expect(BookFormatKeySchema.parse('portrait-large')).toBe('portrait-large');
  });

  it('rejects invalid format keys', () => {
    expect(() => BookFormatKeySchema.parse('invalid')).toThrow();
    expect(() => BookFormatKeySchema.parse('square')).toThrow();
    expect(() => BookFormatKeySchema.parse('')).toThrow();
  });
});
