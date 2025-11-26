import type {
  Story,
  StoryBeat,
  VisualStyleGuide,
  StoryCharacter,
  ShotComposition,
} from '../schemas';

/**
 * Builds image generation prompts from Story data
 *
 * Combines beat description, character details, shot composition,
 * and global style guide into a coherent prompt for image generation.
 */

export interface PromptParts {
  prompt: string;
  negativePrompt: string;
}

/**
 * Build a complete prompt for a story beat
 */
export const buildBeatPrompt = (
  beat: StoryBeat,
  style: VisualStyleGuide,
  characters: Record<string, StoryCharacter>,
  pageText?: string
): PromptParts => {
  const parts: string[] = [];

  // 1. Art style and medium
  parts.push(buildStylePrefix(style));

  // 2. Scene description from beat
  parts.push(beat.summary);

  // 3. Emotional tone
  parts.push(`${beat.emotion} mood`);

  // 4. Characters in scene
  if (beat.characters.length > 0) {
    const characterDescriptions = beat.characters
      .map((beatChar) => {
        const char = characters[beatChar.id];
        if (!char) return null;
        return `${char.name} (${char.description}), ${beatChar.expression} expression, ${beatChar.pose} pose`;
      })
      .filter(Boolean);

    if (characterDescriptions.length > 0) {
      parts.push(characterDescriptions.join('; '));
    }
  }

  // 5. Shot composition
  parts.push(buildShotDescription(beat.shot));

  // 6. Setting details
  if (beat.setting) {
    const settingParts: string[] = [];
    if (beat.setting.location) settingParts.push(beat.setting.location);
    if (beat.setting.time_of_day) settingParts.push(beat.setting.time_of_day);
    if (beat.setting.season) settingParts.push(beat.setting.season);
    if (settingParts.length > 0) {
      parts.push(settingParts.join(', '));
    }
  } else if (style.setting) {
    // Fall back to global setting
    const settingParts: string[] = [];
    if (style.setting.location) settingParts.push(style.setting.location);
    if (style.setting.biome) settingParts.push(style.setting.biome);
    if (settingParts.length > 0) {
      parts.push(settingParts.join(', '));
    }
  }

  // 7. Lighting
  if (beat.shot.overrides?.lighting || style.lighting) {
    const lighting = beat.shot.overrides?.lighting ?? style.lighting;
    if (lighting) {
      parts.push(buildLightingDescription(lighting));
    }
  }

  // 8. Color palette
  if (beat.shot.overrides?.color || style.color_script) {
    const color = beat.shot.overrides?.color ?? style.color_script;
    if (color) {
      parts.push(buildColorDescription(color));
    }
  }

  // 9. Picture book style qualifier
  parts.push('children\'s picture book illustration, high quality, detailed');

  const prompt = parts.filter(Boolean).join(', ');

  // Build negative prompt from constraints
  const negativePrompt = buildNegativePrompt(style);

  return { prompt, negativePrompt };
};

const buildStylePrefix = (style: VisualStyleGuide): string => {
  const { art_direction } = style;
  const parts: string[] = [];

  if (art_direction.genre.length > 0) {
    parts.push(art_direction.genre.join(' '));
  }
  if (art_direction.medium.length > 0) {
    parts.push(art_direction.medium.join(', '));
  }
  if (art_direction.technique.length > 0) {
    parts.push(art_direction.technique.join(', '));
  }

  return parts.join(', ') || 'digital illustration';
};

const buildShotDescription = (shot: ShotComposition): string => {
  const parts: string[] = [];

  // Shot size
  const sizeMap: Record<string, string> = {
    extreme_wide: 'extreme wide shot',
    wide: 'wide shot',
    medium_wide: 'medium wide shot',
    medium: 'medium shot',
    medium_close: 'medium close-up',
    close_up: 'close-up',
    extreme_close_up: 'extreme close-up',
    macro_detail: 'macro detail shot',
    insert_object: 'insert shot',
  };
  parts.push(sizeMap[shot.size] || shot.size);

  // Camera angle
  const angleMap: Record<string, string> = {
    eye_level: 'eye level',
    childs_eye: 'child\'s eye view',
    high_angle: 'high angle',
    birds_eye: 'bird\'s eye view',
    worms_eye: 'worm\'s eye view',
    low_angle_hero: 'low angle hero shot',
    three_quarter_view: 'three-quarter view',
    profile_side: 'profile view',
    dutch_tilt: 'dutch angle',
    isometric_view: 'isometric view',
  };
  parts.push(angleMap[shot.angle] || shot.angle);

  // Composition rules
  if (shot.composition && shot.composition.length > 0) {
    const compMap: Record<string, string> = {
      centered_hero: 'centered composition',
      thirds_composition: 'rule of thirds',
      symmetrical: 'symmetrical composition',
      foreground_frame: 'foreground framing',
      deep_space: 'deep space composition',
      diagonal_composition: 'diagonal composition',
      negative_space: 'negative space',
      silhouette: 'silhouette',
    };
    const comps = shot.composition.map((c) => compMap[c] || c).filter(Boolean);
    if (comps.length > 0) {
      parts.push(comps.join(', '));
    }
  }

  return parts.join(', ');
};

const buildLightingDescription = (lighting: Partial<{
  scheme: string[];
  direction: string[];
  quality?: string;
  temperature_K?: number;
}>): string => {
  const parts: string[] = [];

  if (lighting.scheme && lighting.scheme.length > 0) {
    parts.push(lighting.scheme.join(' '));
  }
  if (lighting.direction && lighting.direction.length > 0) {
    parts.push(`${lighting.direction.join(' ')} lighting`);
  }
  if (lighting.quality) {
    parts.push(`${lighting.quality} light`);
  }
  if (lighting.temperature_K) {
    if (lighting.temperature_K < 4000) {
      parts.push('warm lighting');
    } else if (lighting.temperature_K > 6000) {
      parts.push('cool lighting');
    }
  }

  return parts.join(', ') || 'soft natural lighting';
};

const buildColorDescription = (color: Partial<{
  harmony?: string;
  palette: string[];
  saturation_level?: string;
  value_key?: string;
}>): string => {
  const parts: string[] = [];

  if (color.palette && color.palette.length > 0) {
    parts.push(color.palette.slice(0, 4).join(', ') + ' colors');
  }
  if (color.harmony) {
    parts.push(`${color.harmony} color harmony`);
  }
  if (color.saturation_level) {
    parts.push(`${color.saturation_level} saturation`);
  }

  return parts.join(', ');
};

const buildNegativePrompt = (style: VisualStyleGuide): string => {
  const defaults = [
    'blurry',
    'low quality',
    'distorted',
    'deformed',
    'ugly',
    'bad anatomy',
    'extra limbs',
    'text',
    'watermark',
    'signature',
    'scary',
    'violent',
    'inappropriate',
  ];

  const constraints = style.constraints?.negative ?? [];

  return [...defaults, ...constraints].join(', ');
};

/**
 * Build a simplified prompt for quick generation (without full style)
 */
export const buildSimplePrompt = (
  description: string,
  style: 'watercolor' | 'digital' | 'cartoon' | 'realistic' = 'digital'
): PromptParts => {
  const styleMap = {
    watercolor: 'watercolor illustration, soft colors, hand-painted feel',
    digital: 'digital illustration, vibrant colors, clean lines',
    cartoon: 'cartoon style, bold outlines, bright colors',
    realistic: 'realistic illustration, detailed, natural colors',
  };

  const prompt = `${styleMap[style]}, ${description}, children's picture book, high quality`;
  const negativePrompt = 'blurry, low quality, scary, violent, inappropriate, text, watermark';

  return { prompt, negativePrompt };
};
