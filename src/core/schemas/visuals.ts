import { z } from 'zod';

/**
 * Stage 4: VisualDirection - Output of visualsAgent
 */

// Style building blocks
export const LightingSchema = z.object({
  scheme: z.array(z.string().min(1)).describe('Lighting types (e.g., "natural", "rim light", "backlit")'),
  direction: z.array(z.string().min(1)).describe('Light source directions (e.g., "top-left", "behind subject")'),
  quality: z.string().optional().describe('Light quality (e.g., "soft", "harsh", "diffused")'),
  temperature_K: z.number().optional().describe('Color temperature in Kelvin (e.g., 5500 for daylight)'),
  contrast_ratio: z.string().optional().describe('Shadow intensity (e.g., "high contrast", "low contrast")'),
  volumetrics: z.object({
    godrays: z.string().optional().describe('Light ray effects through atmosphere'),
    ambient: z.string().optional().describe('Ambient lighting description'),
  }).optional().describe('Atmospheric light effects'),
});

export const ColorScriptSchema = z.object({
  harmony: z.string().optional().describe('Color harmony type (e.g., "complementary", "analogous", "triadic")'),
  palette: z.array(z.string().min(1)).default([]).describe('Main colors in the palette'),
  accent_colors: z.array(z.string().min(1)).default([]).describe('Pop colors for emphasis'),
  saturation_level: z.string().optional().describe('Overall saturation (e.g., "vibrant", "muted", "pastel")'),
  value_key: z.string().optional().describe('Overall brightness (e.g., "high key", "low key")'),
});

export const MoodSchema = z.object({
  beat: z.string().optional().describe('Emotional beat of this moment (e.g., "wonder", "tension")'),
  tone: z.array(z.string().min(1)).default([]).describe('Mood descriptors (e.g., "cozy", "mysterious", "joyful")'),
  sliders: z.record(z.number().min(0).max(1)).optional().describe('Mood intensity values 0-1 (e.g., {"warmth": 0.8})'),
});

export const FocalHierarchySchema = z.object({
  priority: z.array(z.string().min(1)).default([]).describe('Elements in order of visual importance'),
  min_visibility: z.record(z.array(z.string().min(1))).optional().describe('Required visible parts per element'),
  no_crop: z.array(z.string().min(1)).default([]).describe('Elements that must be fully visible'),
  focus_plane: z.string().optional().describe('Depth of field focus (e.g., "foreground", "midground")'),
});

export const AtmosphereFxSchema = z.object({
  fog: z.object({
    style_reference: z.string().optional().describe('Fog style (e.g., "morning mist", "dense fog")'),
    hue: z.string().optional().describe('Fog color tint'),
    density: z.string().optional().describe('Fog thickness (e.g., "light", "heavy")'),
    height: z.string().optional().describe('Fog height level'),
  }).optional().describe('Fog and mist effects'),
  bloom: z.string().optional().describe('Light bloom intensity'),
  lens_flare: z.string().optional().describe('Lens flare style'),
  particles: z.object({
    type: z.string().optional().describe('Particle type (e.g., "dust", "snow", "fireflies")'),
    density: z.string().optional().describe('Particle density'),
  }).optional().describe('Floating particle effects'),
  dew: z.string().optional().describe('Dew/moisture effects on surfaces'),
});

export const MaterialsMicrodetailSchema = z.object({
  microdetail_level: z.string().optional().describe('Detail fidelity (e.g., "high", "stylized", "simplified")'),
  detail_budget: z.object({
    priority: z.array(z.string().min(1)).default([]).describe('Elements to render in high detail'),
    deprioritize: z.array(z.string().min(1)).default([]).describe('Elements to simplify'),
  }).optional().describe('Where to allocate rendering detail'),
});

export const ConstraintsSchema = z.object({
  negative: z.array(z.string().min(1)).default([]).describe('Things to avoid (e.g., "scary imagery", "text")'),
  style_caps: z.record(z.string().min(1)).optional().describe('Style limitations per element'),
});

export const SettingSchema = z.object({
  biome: z.string().optional().describe('Environment type (e.g., "forest", "underwater", "urban")'),
  location: z.string().optional().describe('Specific place (e.g., "cozy cottage kitchen", "treehouse")'),
  detail_description: z.string().optional().describe('Additional setting details'),
  season: z.string().optional().describe('Time of year (e.g., "autumn", "winter")'),
  time_of_day: z.string().optional().describe('Time (e.g., "golden hour", "night", "midday")'),
  landmarks: z.array(z.string().min(1)).default([]).describe('Notable features in the scene'),
  diegetic_lights: z.array(z.string().min(1)).default([]).describe('In-scene light sources (e.g., "campfire", "lantern")'),
});

// Partial schemas for per-shot overrides
export const LightingPartialSchema = LightingSchema.partial();
export const ColorScriptPartialSchema = ColorScriptSchema.partial();
export const MoodPartialSchema = MoodSchema.partial();
export const FocalHierarchyPartialSchema = FocalHierarchySchema.partial();
export const AtmosphereFxPartialSchema = AtmosphereFxSchema.partial();
export const MaterialsMicrodetailPartialSchema = MaterialsMicrodetailSchema.partial();
export const ConstraintsPartialSchema = ConstraintsSchema.partial();
export const SettingPartialSchema = SettingSchema.partial();

export type Lighting = z.infer<typeof LightingSchema>;
export type ColorScript = z.infer<typeof ColorScriptSchema>;
export type Mood = z.infer<typeof MoodSchema>;
export type FocalHierarchy = z.infer<typeof FocalHierarchySchema>;
export type AtmosphereFx = z.infer<typeof AtmosphereFxSchema>;
export type MaterialsMicrodetail = z.infer<typeof MaterialsMicrodetailSchema>;
export type Constraints = z.infer<typeof ConstraintsSchema>;
export type Setting = z.infer<typeof SettingSchema>;

// ShotComposition DSL
export const ShotCompositionSchema = z.object({
  size: z.enum(['extreme_wide', 'wide', 'medium_wide', 'medium', 'medium_close', 'close_up', 'extreme_close_up', 'macro_detail', 'insert_object'])
    .describe('Shot size/framing distance from subject'),
  angle: z.enum(['eye_level', 'childs_eye', 'high_angle', 'birds_eye', 'worms_eye', 'low_angle_hero', 'three_quarter_view', 'profile_side', 'dutch_tilt', 'isometric_view'])
    .describe('Camera angle relative to subject'),
  pov: z.enum(['objective_view', 'character_pov', 'over_shoulder', 'follow_from_behind', 'reaction_close', 'crowd_pov', 'threat_pov', 'reflection_pov']).optional()
    .describe('Point of view perspective'),
  composition: z.array(z.enum(['centered_hero', 'thirds_composition', 'symmetrical', 'foreground_frame', 'deep_space', 'diagonal_composition', 'negative_space', 'silhouette', 'shadow_play', 'reflection_focus', 'crowd_search'])).optional()
    .describe('Visual composition techniques for element arrangement'),
  layout: z.enum(['full_bleed_single', 'full_bleed_spread', 'framed_illustration', 'spot_illustration', 'clustered_vignettes', 'multi_panel', 'progression_strip', 'side_scroller_spread', 'cutaway_cross_section', 'dollhouse_view', 'map_spread', 'split_screen', 'before_after', 'zoom_sequence']).optional()
    .describe('Page layout structure'),
  staging: z.object({
    anchors: z.array(z.object({
      subject: z.string().min(1).describe('Element being positioned'),
      grid: z.string().min(1).describe('Grid position (e.g., "center", "top-left third")'),
    })).optional().describe('Subject positions on composition grid'),
    depth: z.object({
      fg: z.array(z.string().min(1)).optional().describe('Foreground elements'),
      mg: z.array(z.string().min(1)).optional().describe('Midground elements'),
      bg: z.array(z.string().min(1)).optional().describe('Background elements'),
    }).optional().describe('Depth layer assignments'),
    negative_space: z.string().optional().describe('Where to leave empty space'),
    leading_lines: z.string().optional().describe('Lines that guide eye to focal point'),
  }).optional().describe('Element placement within the frame'),
  cinematography: z.object({
    focal_length_mm: z.number().optional().describe('Lens focal length in mm'),
    aperture_f: z.number().optional().describe('Aperture f-stop'),
    dof: z.string().optional().describe('Depth of field (e.g., "shallow", "deep")'),
    camera_height: z.string().optional().describe('Camera height relative to scene'),
    movement: z.string().optional().describe('Implied camera movement'),
  }).optional().describe('Camera/lens settings for the shot'),
  overrides: z.object({
    lighting: LightingPartialSchema.optional(),
    color: ColorScriptPartialSchema.optional(),
    mood: MoodPartialSchema.optional(),
    focal_hierarchy: FocalHierarchyPartialSchema.optional(),
    atmosphere_fx: AtmosphereFxPartialSchema.optional(),
    materials_microdetail: MaterialsMicrodetailPartialSchema.optional(),
    constraints: ConstraintsPartialSchema.optional(),
  }).optional().describe('Per-shot overrides of global style settings'),
});

export type ShotComposition = z.infer<typeof ShotCompositionSchema>;

// BeatCharacter: character reference within a beat
export const BeatCharacterSchema = z.object({
  id: z.string().min(1).describe('Character ID from Story.characters'),
  expression: z.string().min(1).describe('Facial expression (e.g., "wide-eyed wonder")'),
  pose: z.string().min(1).describe('Body posture and action'),
  focus: z.enum(['primary', 'secondary', 'background']).describe('Visual prominence in the shot'),
});

export type BeatCharacter = z.infer<typeof BeatCharacterSchema>;

// IllustrationBeat: one visual moment with shot composition
export const IllustrationBeatSchema = z.object({
  order: z.number().int().min(1).describe('Sequence within the page (1, 2, 3...)'),
  purpose: z.enum(['setup', 'build', 'twist', 'climax', 'payoff', 'button']).describe('Narrative function of this beat'),
  summary: z.string().min(1).describe('What is happening visually'),
  emotion: z.string().min(1).describe('The emotional tone to convey'),
  characters: z.array(BeatCharacterSchema).default([]),
  setting: SettingPartialSchema.optional().describe('Override the global setting for this beat'),
  shot: ShotCompositionSchema,
});

export type IllustrationBeat = z.infer<typeof IllustrationBeatSchema>;

// VisualStyleGuide: Global visual style
export const VisualStyleGuideSchema = z.object({
  art_direction: z.object({
    genre: z.array(z.string().min(1)).default([]).describe('Art genres (e.g., "picture book", "storybook", "whimsical")'),
    medium: z.array(z.string().min(1)).default([]).describe('Artistic mediums (e.g., "watercolor", "digital", "gouache")'),
    technique: z.array(z.string().min(1)).default([]).describe('Rendering techniques (e.g., "soft edges", "bold outlines")'),
    style_strength: z.number().min(0).max(1).optional().describe('How strongly to apply style (0=subtle, 1=dominant)'),
  }).describe('Overall artistic style direction'),
  setting: SettingSchema.describe('Default setting for the story'),
  lighting: LightingSchema.optional().describe('Default lighting setup'),
  color_script: ColorScriptSchema.optional().describe('Color palette and mood'),
  mood_narrative: MoodSchema.optional().describe('Emotional tone throughout'),
  atmosphere_fx: AtmosphereFxSchema.optional().describe('Atmospheric effects'),
  materials_microdetail: MaterialsMicrodetailSchema.optional().describe('Detail and texture settings'),
  constraints: ConstraintsSchema.optional().describe('Things to avoid in illustrations'),
});

export type VisualStyleGuide = z.infer<typeof VisualStyleGuideSchema>;

// IllustratedPage: a single page with visual beats
export const IllustratedPageSchema = z.object({
  pageNumber: z.number().int().min(1),
  beats: z.array(IllustrationBeatSchema).min(1),
});

export type IllustratedPage = z.infer<typeof IllustratedPageSchema>;

// VisualDirection: Output of visualsAgent
export const VisualDirectionSchema = z.object({
  style: VisualStyleGuideSchema,
  illustratedPages: z.array(IllustratedPageSchema).min(1),
});

export type VisualDirection = z.infer<typeof VisualDirectionSchema>;
