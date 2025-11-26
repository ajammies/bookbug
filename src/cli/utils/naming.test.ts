import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { titleToSlug, getTimestamp, generateStoryFolder } from './naming';

describe('titleToSlug', () => {
  it('converts title to lowercase', () => {
    expect(titleToSlug('The Magic Garden')).toBe('the-magic-garden');
  });

  it('replaces spaces with hyphens', () => {
    expect(titleToSlug('a b c')).toBe('a-b-c');
  });

  it('removes special characters', () => {
    expect(titleToSlug("Max's Adventure!")).toBe('maxs-adventure');
  });

  it('removes leading and trailing whitespace', () => {
    expect(titleToSlug('  hello world  ')).toBe('hello-world');
  });

  it('collapses multiple hyphens into one', () => {
    expect(titleToSlug('hello---world')).toBe('hello-world');
  });

  it('removes leading and trailing hyphens', () => {
    expect(titleToSlug('-hello-')).toBe('hello');
  });

  it('truncates to 50 characters', () => {
    const longTitle = 'a'.repeat(60);
    expect(titleToSlug(longTitle)).toHaveLength(50);
  });

  it('handles empty string', () => {
    expect(titleToSlug('')).toBe('');
  });

  it('handles string with only special characters', () => {
    expect(titleToSlug('!@#$%')).toBe('');
  });

  it('handles unicode characters', () => {
    expect(titleToSlug('Café Stories')).toBe('caf-stories');
  });
});

describe('getTimestamp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns timestamp in YYYYMMDD-HHmmss format', () => {
    vi.setSystemTime(new Date(2024, 10, 26, 14, 30, 52));
    expect(getTimestamp()).toBe('20241126-143052');
  });

  it('pads single-digit values with zeros', () => {
    vi.setSystemTime(new Date(2024, 0, 5, 9, 5, 3));
    expect(getTimestamp()).toBe('20240105-090503');
  });

  it('handles end of year', () => {
    vi.setSystemTime(new Date(2024, 11, 31, 23, 59, 59));
    expect(getTimestamp()).toBe('20241231-235959');
  });
});

describe('generateStoryFolder', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 10, 26, 14, 30, 52));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('combines slug and timestamp', () => {
    expect(generateStoryFolder('The Magic Garden')).toBe(
      'the-magic-garden-20241126-143052'
    );
  });

  it('uses "untitled-story" for empty title', () => {
    expect(generateStoryFolder('')).toBe('untitled-story-20241126-143052');
  });

  it('uses "untitled-story" for title with only special characters', () => {
    expect(generateStoryFolder('!@#$%')).toBe('untitled-story-20241126-143052');
  });
});
