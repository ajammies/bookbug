import { z } from 'zod';

/**
 * Book Format Presets
 *
 * Lulu-compatible trim sizes for print-on-demand children's books.
 * All dimensions at 300dpi with 0.125" bleed on each side.
 */

export const BOOK_FORMATS = {
  'square-small': {
    name: 'Small Square',
    trimWidth: 2250,    // 7.5" at 300dpi
    trimHeight: 2250,
    bleedWidth: 2325,   // 7.75" with 0.125" bleed
    bleedHeight: 2325,
  },
  'square-large': {
    name: 'Large Square',
    trimWidth: 2550,    // 8.5" at 300dpi
    trimHeight: 2550,
    bleedWidth: 2625,   // 8.75" with bleed
    bleedHeight: 2625,
  },
  'landscape': {
    name: 'Landscape',
    trimWidth: 2700,    // 9" at 300dpi
    trimHeight: 2100,   // 7" at 300dpi
    bleedWidth: 2775,   // 9.25" with bleed
    bleedHeight: 2175,  // 7.25" with bleed
  },
  'portrait-small': {
    name: 'US Trade',
    trimWidth: 1800,    // 6" at 300dpi
    trimHeight: 2700,   // 9" at 300dpi
    bleedWidth: 1875,   // 6.25" with bleed
    bleedHeight: 2775,  // 9.25" with bleed
  },
  'portrait-large': {
    name: 'Letter',
    trimWidth: 2550,    // 8.5" at 300dpi
    trimHeight: 3300,   // 11" at 300dpi
    bleedWidth: 2625,   // 8.75" with bleed
    bleedHeight: 3375,  // 11.25" with bleed
  },
} as const;

export type BookFormat = typeof BOOK_FORMATS[keyof typeof BOOK_FORMATS];
export type BookFormatKey = keyof typeof BOOK_FORMATS;

export const BookFormatKeySchema = z.enum([
  'square-small',
  'square-large',
  'landscape',
  'portrait-small',
  'portrait-large',
]);

/**
 * Standard aspect ratios supported by image generation models
 */
const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'] as const;
export type AspectRatio = typeof ASPECT_RATIOS[number];

/**
 * Get the closest standard aspect ratio for a book format
 *
 * Image generation models typically only support standard ratios.
 * This maps our exact print dimensions to the nearest supported ratio.
 */
export const getAspectRatio = (format: { bleedWidth: number; bleedHeight: number }): AspectRatio => {
  const ratio = format.bleedWidth / format.bleedHeight;

  // Check against standard ratios with tolerance
  if (Math.abs(ratio - 1) < 0.1) return '1:1';
  if (Math.abs(ratio - 16 / 9) < 0.1) return '16:9';
  if (Math.abs(ratio - 9 / 16) < 0.1) return '9:16';
  if (Math.abs(ratio - 4 / 3) < 0.1) return '4:3';
  if (Math.abs(ratio - 3 / 4) < 0.1) return '3:4';
  if (Math.abs(ratio - 3 / 2) < 0.1) return '3:2';
  if (Math.abs(ratio - 2 / 3) < 0.1) return '2:3';

  // Default to closest orientation
  if (ratio > 1) return '4:3';
  if (ratio < 1) return '3:4';
  return '1:1';
};
