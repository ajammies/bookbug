import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';

/**
 * Style preset schema - name + art_direction only
 */
const ArtDirectionSchema = z.object({
  genre: z.array(z.string().min(1)).default([]),
  medium: z.array(z.string().min(1)).default([]),
  technique: z.array(z.string().min(1)).default([]),
  style_strength: z.number().min(0).max(1).optional(),
});

const StylePresetSchema = z.object({
  name: z.string().min(1),
  art_direction: ArtDirectionSchema,
});

export type ArtDirection = z.infer<typeof ArtDirectionSchema>;
export type StylePreset = z.infer<typeof StylePresetSchema>;

const STYLES_DIR = path.join(process.cwd(), 'prompts', 'styles');

/**
 * List available style preset names
 */
export const listStyles = async (): Promise<string[]> => {
  try {
    const files = await fs.readdir(STYLES_DIR);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch {
    return [];
  }
};

/**
 * Load a style preset by name
 */
export const loadStyle = async (name: string): Promise<StylePreset> => {
  const filePath = path.join(STYLES_DIR, `${name}.json`);
  const content = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(content);
  return StylePresetSchema.parse(data);
};

/**
 * Get just the art_direction from a preset
 */
export const loadArtDirection = async (name: string): Promise<ArtDirection> => {
  const preset = await loadStyle(name);
  return preset.art_direction;
};
