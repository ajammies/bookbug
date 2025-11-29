import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  titleToFileSafeName,
  formatSortableTimestamp,
  formatHumanDate,
  createStoryFolderName,
} from './naming';

describe('titleToFileSafeName', () => {
  it('converts title to lowercase', () => {
    expect(titleToFileSafeName('The Magic Garden')).toBe('the-magic-garden');
  });

  it('replaces spaces with hyphens', () => {
    expect(titleToFileSafeName('a b c')).toBe('a-b-c');
  });

  it('removes special characters', () => {
    expect(titleToFileSafeName("Max's Adventure!")).toBe('maxs-adventure');
  });

  it('removes leading and trailing whitespace', () => {
    expect(titleToFileSafeName('  hello world  ')).toBe('hello-world');
  });

  it('collapses multiple hyphens into one', () => {
    expect(titleToFileSafeName('hello---world')).toBe('hello-world');
  });

  it('removes leading and trailing hyphens', () => {
    expect(titleToFileSafeName('-hello-')).toBe('hello');
  });

  it('truncates to 50 characters', () => {
    const longTitle = 'a'.repeat(60);
    expect(titleToFileSafeName(longTitle)).toHaveLength(50);
  });

  it('handles empty string', () => {
    expect(titleToFileSafeName('')).toBe('');
  });

  it('handles string with only special characters', () => {
    expect(titleToFileSafeName('!@#$%')).toBe('');
  });

  it('handles unicode characters', () => {
    expect(titleToFileSafeName('Café Stories')).toBe('caf-stories');
  });
});

describe('formatSortableTimestamp', () => {
  it('returns timestamp in YYYYMMDD-HHmmss format', () => {
    const date = new Date(2024, 10, 26, 14, 30, 52);
    expect(formatSortableTimestamp(date)).toBe('20241126-143052');
  });

  it('pads single-digit values with zeros', () => {
    const date = new Date(2024, 0, 5, 9, 5, 3);
    expect(formatSortableTimestamp(date)).toBe('20240105-090503');
  });

  it('handles end of year', () => {
    const date = new Date(2024, 11, 31, 23, 59, 59);
    expect(formatSortableTimestamp(date)).toBe('20241231-235959');
  });
});

describe('formatHumanDate', () => {
  it('returns date in DD-Mon-YYYY format', () => {
    const date = new Date(2024, 10, 26);
    expect(formatHumanDate(date)).toBe('26-Nov-2024');
  });

  it('pads single-digit days with zeros', () => {
    const date = new Date(2024, 0, 5);
    expect(formatHumanDate(date)).toBe('05-Jan-2024');
  });

  it('handles all months', () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    months.forEach((month, index) => {
      const date = new Date(2024, index, 15);
      expect(formatHumanDate(date)).toBe(`15-${month}-2024`);
    });
  });
});

describe('createStoryFolderName', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 10, 26, 14, 30, 52));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('combines timestamp, name, and human date', () => {
    expect(createStoryFolderName('The Magic Garden')).toBe(
      '20241126-143052-the-magic-garden-26-Nov-2024'
    );
  });

  it('uses "untitled-story" for empty title', () => {
    expect(createStoryFolderName('')).toBe('20241126-143052-untitled-story-26-Nov-2024');
  });

  it('uses "untitled-story" for title with only special characters', () => {
    expect(createStoryFolderName('!@#$%')).toBe('20241126-143052-untitled-story-26-Nov-2024');
  });
});
