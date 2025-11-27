/**
 * Convert a title to a file-safe name
 * - Lowercase, hyphenated, max 50 chars
 */
export const titleToFileSafeName = (title: string): string => {
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
 * Format timestamp as YYYYMMDD-HHmmss
 */
export const formatTimestamp = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

/**
 * Create a story folder name from a title
 * Format: {name}-{timestamp}
 * Example: "the-magic-garden-20241126-143052"
 */
export const createStoryFolderName = (title: string): string => {
  const name = titleToFileSafeName(title) || 'untitled-story';
  return `${name}-${formatTimestamp()}`;
};
