/**
 * Utility functions for generating story folder names
 */

/**
 * Convert a title to a URL-friendly slug
 * - Lowercase, hyphenated, max 50 chars
 */
export const titleToSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
};

/**
 * Generate timestamp in YYYYMMDD-HHmmss format
 */
export const getTimestamp = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

/**
 * Generate a story folder name from a title
 * Format: {slug}-{timestamp}
 * Example: "the-magic-garden-20241126-143052"
 */
export const generateStoryFolder = (title: string): string => {
  const slug = titleToSlug(title) || 'untitled-story';
  return `${slug}-${getTimestamp()}`;
};
