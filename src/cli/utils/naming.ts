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
 * Format sortable timestamp as YYYYMMDD-HHmmss
 */
export const formatSortableTimestamp = (d: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

/**
 * Format human-readable date as DD-Mon-YYYY
 */
export const formatHumanDate = (d: Date = new Date()): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${months[d.getMonth()]}-${d.getFullYear()}`;
};

/**
 * Create a story folder name from a title
 * Format: {YYYYMMDD}-{HHmmss}-{name}-{DD-Mon-YYYY}
 * Example: "20241126-143052-the-magic-garden-26-Nov-2024"
 */
export const createStoryFolderName = (title: string): string => {
  const now = new Date();
  const name = titleToFileSafeName(title) || 'untitled-story';
  return `${formatSortableTimestamp(now)}-${name}-${formatHumanDate(now)}`;
};
