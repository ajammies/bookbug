import { z } from "zod";

/**
 * Domain Schemas for Bookbug Children's Book Generator
 *
 * Data flow: StoryBrief → Manuscript → Story → Book
 */

// ============================================================
// 1. DOMAIN BASICS (shared across pipeline)
// ============================================================

export const AgeRangeSchema = z
  .object({
    min: z.number().int().min(2).max(12),
    max: z.number().int().min(2).max(12),
  })
  .refine((range) => range.min <= range.max, {
    message: "ageRange.min must be <= ageRange.max",
    path: ["max"],
  });

export type AgeRange = z.infer<typeof AgeRangeSchema>;

export const StoryCharacterSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  role: z.string().optional(),
  traits: z.array(z.string().min(1)).default([]),
  notes: z.array(z.string().min(1)).default([]),
});

export type StoryCharacter = z.infer<typeof StoryCharacterSchema>;

// ============================================================
// 2. BOOK BUILDER → StoryBrief (requirements / intent)
// ============================================================

export const StoryBriefSchema = z.object({
  title: z.string().min(1),
  storyArc: z.string().min(1),
  setting: z.string().min(1),
  ageRange: AgeRangeSchema,
  pageCount: z.number().int().min(8).max(32).default(24),
  characters: z.array(StoryCharacterSchema).min(1),
  tone: z.string().optional(),
  moral: z.string().optional(),
  interests: z.array(z.string().min(1)).default([]),
  customInstructions: z.array(z.string().min(1)).default([]),
});

export type StoryBrief = z.infer<typeof StoryBriefSchema>;

export const StoryBlurbSchema = z.object({
  brief: StoryBriefSchema,
  plotBeats: z.array(z.string().min(1)).default([]),
  allowCreativeLiberty: z.boolean().default(true),
});

export type StoryBlurb = z.infer<typeof StoryBlurbSchema>;

// ============================================================
// 3. AUTHOR → Manuscript (manuscript + page breakdown)
// ============================================================

export const ManuscriptPageSchema = z.object({
  pageNumber: z.number().int().min(1),
  summary: z.string().min(1),
  text: z.string().min(1),
  imageConcept: z.string().min(1),
});

export type ManuscriptPage = z.infer<typeof ManuscriptPageSchema>;

export const ManuscriptSchema = z.object({
  blurb: StoryBlurbSchema,
  title: z.string().min(1),
  logline: z.string().min(1),
  theme: z.string().min(1),
  setting: z.string().min(1),
  moral: z.string().optional(),
  ageRange: AgeRangeSchema,
  tone: z.string().optional(),
  styleNotes: z.string().optional(),
  characters: z.array(StoryCharacterSchema).min(1),
  pages: z.array(ManuscriptPageSchema).min(1),
  pageCount: z.number().int().min(8).max(32),
})
.refine((manuscript) => manuscript.pages.length === manuscript.pageCount, {
  message: "pages.length must equal pageCount",
  path: ["pages"],
})
.refine((manuscript) => {
  const pageNums = manuscript.pages.map(p => p.pageNumber);
  const expectedNums = Array.from({ length: manuscript.pageCount }, (_, i) => i + 1);
  return pageNums.every((num, idx) => num === expectedNums[idx]);
}, {
  message: "pages must be sequentially numbered starting at 1",
  path: ["pages"],
});

export type Manuscript = z.infer<typeof ManuscriptSchema>;

// ============================================================
// 4. DIRECTOR → Story (visual direction + complete story)
// ============================================================

// Shared style building blocks
export const LightingSchema = z.object({
  scheme: z.array(z.string().min(1)),
  direction: z.array(z.string().min(1)),
  quality: z.string().optional(),
  temperature_K: z.number().optional(),
  contrast_ratio: z.string().optional(),
  volumetrics: z.object({
    godrays: z.string().optional(),
    ambient: z.string().optional(),
  }).optional(),
});

export const ColorScriptSchema = z.object({
  harmony: z.string().optional(),
  palette: z.array(z.string().min(1)).default([]),
  accent_colors: z.array(z.string().min(1)).default([]),
  saturation_level: z.string().optional(),
  value_key: z.string().optional(),
});

export const MoodSchema = z.object({
  beat: z.string().optional(),
  tone: z.array(z.string().min(1)).default([]),
  sliders: z.record(z.number().min(0).max(1)).optional(),
});

export const FocalHierarchySchema = z.object({
  priority: z.array(z.string().min(1)).default([]),
  min_visibility: z.record(z.array(z.string().min(1))).optional(),
  no_crop: z.array(z.string().min(1)).default([]),
  focus_plane: z.string().optional(),
});

export const AtmosphereFxSchema = z.object({
  fog: z.object({
    style_reference: z.string().optional(),
    hue: z.string().optional(),
    density: z.string().optional(),
    height: z.string().optional(),
  }).optional(),
  bloom: z.string().optional(),
  lens_flare: z.string().optional(),
  particles: z.object({
    type: z.string().optional(),
    density: z.string().optional(),
  }).optional(),
  dew: z.string().optional(),
});

export const MaterialsMicrodetailSchema = z.object({
  microdetail_level: z.string().optional(),
  detail_budget: z.object({
    priority: z.array(z.string().min(1)).default([]),
    deprioritize: z.array(z.string().min(1)).default([]),
  }).optional(),
});

export const ConstraintsSchema = z.object({
  negative: z.array(z.string().min(1)).default([]),
  style_caps: z.record(z.string().min(1)).optional(),
});

export const SettingSchema = z.object({
  biome: z.string().optional(),
  location: z.string().optional(),
  detail_description: z.string().optional(),
  season: z.string().optional(),
  time_of_day: z.string().optional(),
  landmarks: z.array(z.string().min(1)).default([]),
  diegetic_lights: z.array(z.string().min(1)).default([]),
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
  size: z.enum(["extreme_wide", "wide", "medium_wide", "medium", "medium_close", "close_up", "extreme_close_up", "macro_detail", "insert_object"]),
  angle: z.enum(["eye_level", "childs_eye", "high_angle", "birds_eye", "worms_eye", "low_angle_hero", "three_quarter_view", "profile_side", "dutch_tilt", "isometric_view"]),
  pov: z.enum(["objective_view", "character_pov", "over_shoulder", "follow_from_behind", "reaction_close", "crowd_pov", "threat_pov", "reflection_pov"]).optional(),
  composition: z.array(z.enum(["centered_hero", "thirds_composition", "symmetrical", "foreground_frame", "deep_space", "diagonal_composition", "negative_space", "silhouette", "shadow_play", "reflection_focus", "crowd_search"])).optional(),
  layout: z.enum(["full_bleed_single", "full_bleed_spread", "framed_illustration", "spot_illustration", "clustered_vignettes", "multi_panel", "progression_strip", "side_scroller_spread", "cutaway_cross_section", "dollhouse_view", "map_spread", "split_screen", "before_after", "zoom_sequence"]).optional(),
  staging: z.object({
    anchors: z.array(z.object({
      subject_id: z.string().min(1),
      grid: z.string().min(1),
    })).optional(),
    depth: z.object({
      fg: z.array(z.string().min(1)).optional(),
      mg: z.array(z.string().min(1)).optional(),
      bg: z.array(z.string().min(1)).optional(),
    }).optional(),
    negative_space: z.string().optional(),
    leading_lines: z.string().optional(),
  }).optional(),
  cinematography: z.object({
    focal_length_mm: z.number().optional(),
    aperture_f: z.number().optional(),
    dof: z.string().optional(),
    camera_height: z.string().optional(),
    movement: z.string().optional(),
  }).optional(),
  overrides: z.object({
    lighting: LightingPartialSchema.optional(),
    color: ColorScriptPartialSchema.optional(),
    mood: MoodPartialSchema.optional(),
    focal_hierarchy: FocalHierarchyPartialSchema.optional(),
    atmosphere_fx: AtmosphereFxPartialSchema.optional(),
    materials_microdetail: MaterialsMicrodetailPartialSchema.optional(),
    constraints: ConstraintsPartialSchema.optional(),
  }).optional(),
});

export type ShotComposition = z.infer<typeof ShotCompositionSchema>;

// StoryBeat: one narrative moment + visual shot description
export const StoryBeatSchema = z.object({
  id: z.string(),
  order: z.number().int().min(1),
  page: z.number().int().min(1),
  purpose: z.enum(["setup", "build", "twist", "climax", "payoff", "button"]),
  summary: z.string(),
  emotion: z.string(),
  text_snippet: z.string().optional(),
  characters: z.array(z.object({
    id: z.string(),
    expression: z.string(),
    pose_and_props: z.string(),
    focus: z.enum(['primary', 'secondary', 'background']),
  })).default([]),
  setting: SettingPartialSchema.optional(),
  shot_composition: ShotCompositionSchema,
});

export type StoryBeat = z.infer<typeof StoryBeatSchema>;

// VisualStyleGuide: Global visual style applied across the entire book
export const VisualStyleGuideSchema = z.object({
  art_direction: z.object({
    genre: z.array(z.string().min(1)).default([]),
    medium: z.array(z.string().min(1)).default([]),
    technique: z.array(z.string().min(1)).default([]),
    style_strength: z.number().min(0).max(1).optional(),
  }),
  setting: SettingSchema,
  lighting: LightingSchema.optional(),
  color_script: ColorScriptSchema.optional(),
  mood_narrative: MoodSchema.optional(),
  atmosphere_fx: AtmosphereFxSchema.optional(),
  materials_microdetail: MaterialsMicrodetailSchema.optional(),
  constraints: ConstraintsSchema.optional(),
});

export type VisualStyleGuide = z.infer<typeof VisualStyleGuideSchema>;

// StoryPage: a single page with visual beats
export const StoryPageSchema = z.object({
  pageNumber: z.number().int().min(1),
  manuscriptPageRef: z.number().int().min(1),
  beats: z.array(StoryBeatSchema).min(1),
});

export type StoryPage = z.infer<typeof StoryPageSchema>;

// Story: complete story ready for rendering
export const StorySchema = z.object({
  storyTitle: z.string().min(1),
  storyId: z.string().optional(),
  ageRange: AgeRangeSchema,
  style: VisualStyleGuideSchema,
  pages: z.array(StoryPageSchema).min(1),
});

export type Story = z.infer<typeof StorySchema>;

// ============================================================
// 5. ILLUSTRATOR → Book (final rendered book)
// ============================================================

export const RenderedImageSchema = z.object({
  id: z.string(),
  pageNumber: z.number().int().min(1),
  beatId: z.string().optional(),
  url: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  mimeType: z.string().min(1),
  meta: z.record(z.unknown()).optional(),
});

export type RenderedImage = z.infer<typeof RenderedImageSchema>;

export const BookPageSchema = z.object({
  pageNumber: z.number().int().min(1),
  text: z.string().min(1),
  images: z.array(RenderedImageSchema).min(1),
});

export type BookPage = z.infer<typeof BookPageSchema>;

export const BookSchema = z.object({
  storyTitle: z.string().min(1),
  storyId: z.string().optional(),
  ageRange: AgeRangeSchema,
  pages: z.array(BookPageSchema).min(1),
  meta: z.record(z.unknown()).optional(),
});

export type Book = z.infer<typeof BookSchema>;
