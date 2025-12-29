import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';

/**
 * Style preset schema - name + art_style only
 */
const ArtStyleSchema = z.object({
  genre: z.array(z.string().min(1)).default([]),
  medium: z.array(z.string().min(1)).default([]),
  technique: z.array(z.string().min(1)).default([]),
  style_strength: z.number().optional().describe('Style strength 0-1'),
});

const StylePresetFileSchema = z.object({
  name: z.string().min(1),
  art_style: ArtStyleSchema,
});

export type ArtStyle = z.infer<typeof ArtStyleSchema>;
export type StylePresetFile = z.infer<typeof StylePresetFileSchema>;

const PRESETS_DIR = path.join(process.cwd(), 'prompts', 'presets');

/**
 * List available style preset names
 */
export const listStyles = async (): Promise<string[]> => {
  try {
    const files = await fs.readdir(PRESETS_DIR);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch {
    return [];
  }
};

/**
 * Load a style preset file by name
 */
export const loadStyleFile = async (name: string): Promise<StylePresetFile> => {
  const filePath = path.join(PRESETS_DIR, `${name}.json`);
  const content = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(content);
  return StylePresetFileSchema.parse(data);
};

/**
 * Load the art_style from a preset (for use with styleGuideAgent)
 */
export const loadStylePreset = async (name: string): Promise<ArtStyle> => {
  const preset = await loadStyleFile(name);
  return preset.art_style;
};
